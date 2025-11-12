import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';
import {
  AppNotificationDocument,
  AppNotification,
} from './schema/app-notification.schema';
import { Employee, EmployeeDocument } from '../employee/schema/employee.schema';
import { NotificationGateway } from './notification.gateway';
import { randomUUID } from 'crypto';
import {
  NotificationTargetType,
  NotificationType,
} from '@/common/enum/notification-type.enum';
import { paginateAggregate } from '@/common/helpers/paginationHelper';
import { NotificationResponseDto } from './dto/notification-response.dto';

@Injectable()
export class NotificationService {
  constructor(
    @InjectModel(AppNotification.name)
    private notificationModel: Model<AppNotificationDocument>,

    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Employee.name)
    private employeeModel: Model<EmployeeDocument>,
    private readonly notificationGateway: NotificationGateway,
  ) {}
  async findPagedNotifications(
    current = 1,
    pageSize = 10,
    filter: {
      targetType?: NotificationTargetType; // "INDIVIDUAL" | "POSITION" | "DEPARTMENT" | "EMPLOYEE"
      targetId?: string; // ID của target (nếu có)
      userId?: string; // ID user nếu cần lọc riêng
      read?: boolean; // lọc đã đọc/chưa đọc
    },
  ) {
    const pipeline: PipelineStage[] = [];

    // --- Match động ---
    const match: any = {};

    if (filter.targetType) match.targetType = filter.targetType;
    if (filter.read === true) {
      match.read = true;
    } else if (filter.read === false) {
      match.$or = [{ read: false }, { read: { $exists: false } }];
    }

    if (filter.targetId)
      match.targetIds = { $in: [new Types.ObjectId(filter.targetId)] };
    if (
      filter.userId &&
      filter.targetType === NotificationTargetType.INDIVIDUAL
    ) {
      const employeeId = new Types.ObjectId(filter.userId);

      const users = await this.userModel.find({ employeeId }, { _id: 1 });
      const userIds = users.map((u) => u._id);

      match.userId = { $in: userIds.length > 0 ? userIds : [] };
    }

    if (
      filter.userId &&
      filter.targetType !== NotificationTargetType.INDIVIDUAL
    )
      match.userId = new Types.ObjectId(filter.userId);

    // only push match if it's not empty
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    if (
      (filter.targetType === NotificationTargetType.POSITION ||
        filter.targetType === NotificationTargetType.DEPARTMENT) &&
      !filter.userId
    ) {
      // join department and position
      pipeline.push(
        {
          $lookup: {
            from: 'departments',
            let: { targetIds: { $ifNull: ['$targetIds', []] } },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$targetIds'] } } },
              { $project: { _id: 1, name: 1 } }, // chỉ lấy tên
            ],
            as: 'department',
          },
        },
        {
          $lookup: {
            from: 'positions',
            let: { targetIds: { $ifNull: ['$targetIds', []] } },
            pipeline: [
              { $match: { $expr: { $in: ['$_id', '$$targetIds'] } } },
              { $project: { _id: 1, title: 1 } }, // chỉ lấy title
            ],
            as: 'position',
          },
        },
      );
      // group
      pipeline.push({
        $group: {
          _id: { batchKey: '$batchKey', message: '$message' },
          read: { $min: '$read' },
          createdAt: { $first: '$createdAt' },
          targetType: { $first: '$targetType' },
          department: { $push: '$department' },
          position: { $push: '$position' },
        },
      });
      // add targets name
      pipeline.push({
        $addFields: {
          targets: {
            $cond: [
              { $eq: ['$targetType', NotificationTargetType.DEPARTMENT] },
              {
                $setUnion: [
                  {
                    $reduce: {
                      input: '$department',
                      initialValue: [],
                      in: {
                        $concatArrays: [
                          '$$value',
                          {
                            $map: { input: '$$this', as: 'd', in: '$$d.name' },
                          },
                        ],
                      },
                    },
                  },
                  [], // đảm bảo là mảng
                ],
              },
              {
                $setUnion: [
                  {
                    $reduce: {
                      input: '$position',
                      initialValue: [],
                      in: {
                        $concatArrays: [
                          '$$value',
                          {
                            $map: { input: '$$this', as: 'p', in: '$$p.title' },
                          },
                        ],
                      },
                    },
                  },
                  [],
                ],
              },
            ],
          },
        },
      });
      // select
      pipeline.push({
        $project: {
          _id: 0,
          batchKey: '$_id.batchKey',
          message: '$_id.message',
          read: 1,
          type: 1,
          createdAt: 1,
          updatedAt: 1,
          targetType: 1,
          targetId: 1,
          empCount: 1,
          targets: 1,
        },
      });
    } else {
      // join user
      pipeline.push({
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      });
      // process null
      pipeline.push({
        $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
      });
      // select
      pipeline.push({
        $project: {
          _id: 1,
          message: 1,
          read: 1,
          type: 1,
          createdAt: 1,
          updatedAt: 1,
          targetType: 1,
          targetId: 1,
          'user.username': 1,
          targets: 1,
        },
      });
    }
    // --- Sắp xếp ---
    pipeline.push({ $sort: { createdAt: -1 } });

    // --- Phân trang ---
    return paginateAggregate<NotificationResponseDto>(
      this.notificationModel,
      pipeline,
      current,
      pageSize,
      { dtoClass: NotificationResponseDto },
    );
  }

  async findOne(id: string) {
    const notif = await this.notificationModel.findById(id);
    if (!notif)
      throw new NotFoundException(
        'Notification not found',
        'APP_NOTIFICATION_NOT_FOUND',
      );
    return notif;
  }

  async update(id: string, dto: UpdateAppNotificationDto) {
    const notif = await this.notificationModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!notif)
      throw new NotFoundException(
        'Notification not found',
        'APP_NOTIFICATION_NOT_FOUND',
      );
    return notif;
  }

  async remove(id: string): Promise<void> {
    const result = await this.notificationModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Notification not found');
  }

  async markAsRead(id: string) {
    return this.update(id, { read: true });
  }

  async sendToEmployees(employeeIds: string[], message: string, type?) {
    if (!employeeIds?.length) return [];

    const users = await this.userModel
      .find({
        employeeId: { $in: employeeIds.map((id) => new Types.ObjectId(id)) },
      })
      .lean();

    if (!users.length) return [];

    const batchKey = randomUUID();

    const notifications = users.map((u) => ({
      userId: u._id,
      message,
      batchKey,
      targetType: NotificationTargetType.INDIVIDUAL,
      type: type ?? NotificationType.MESSAGE,
      read: false,
    }));

    const result = await this.notificationModel.insertMany(notifications);

    users.forEach((u) => {
      this.notificationGateway.sendNotificationToUser(
        u._id.toString(),
        message,
      );
    });

    return result;
  }

  async sendToDepartments(departmentIds: string[], message: string) {
    return this.sendToEmployeesByField(
      'departmentId',
      departmentIds,
      message,
      NotificationTargetType.DEPARTMENT,
    );
  }

  async sendToPositions(positionIds: string[], message: string) {
    return this.sendToEmployeesByField(
      'positionId',
      positionIds,
      message,
      NotificationTargetType.POSITION,
    );
  }

  private async sendToEmployeesByField(
    field: 'departmentId' | 'positionId',
    ids: string[],
    message: string,
    targetType:
      | NotificationTargetType.DEPARTMENT
      | NotificationTargetType.POSITION,
  ) {
    if (!ids?.length) return [];

    const employees = await this.employeeModel
      .find({ [field]: { $in: ids.map((id) => new Types.ObjectId(id)) } })
      .select('_id')
      .lean();

    const employeeIds = employees.map((e) => e._id);
    if (!employeeIds.length) return [];

    const users = await this.userModel
      .find({ employeeId: { $in: employeeIds } })
      .lean();

    if (!users.length) return [];

    const batchKey = randomUUID();

    const notifications = users.map((u) => ({
      userId: u._id,
      message,
      batchKey,
      targetType,
      targetIds: ids.map((id) => new Types.ObjectId(id)), // lưu danh sách departmentId/positionId
    }));

    const result = await this.notificationModel.insertMany(notifications);

    users.forEach((u) => {
      this.notificationGateway.sendNotificationToUser(
        u._id.toString(),
        message,
      );
    });

    return result;
  }
}
