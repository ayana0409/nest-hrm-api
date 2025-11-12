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
    if (filter.read) match.read = filter.read;
    if (filter.userId) match.userId = new Types.ObjectId(filter.userId);
    if (filter.targetId)
      match.targetIds = { $in: [new Types.ObjectId(filter.targetId)] };

    // only push match if it's not empty
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // --- Join user nếu cần hiển thị thông tin người nhận ---
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
    );

    // --- Join các bảng phụ thuộc vào targetType ---
    pipeline.push(
      {
        $lookup: {
          from: 'departments',
          localField: 'targetId',
          foreignField: '_id',
          as: 'department',
        },
      },
      {
        $lookup: {
          from: 'positions',
          localField: 'targetId',
          foreignField: '_id',
          as: 'position',
        },
      },
      {
        $lookup: {
          from: 'employees',
          localField: 'targetId',
          foreignField: '_id',
          as: 'employee',
        },
      },
    );

    // --- Nếu là tin gửi hàng loạt (POSITION/DEPARTMENT) thì gom theo batchKey ---
    if (
      (filter.targetType === NotificationTargetType.POSITION ||
        filter.targetType === NotificationTargetType.DEPARTMENT) &&
      !filter.userId
    ) {
      pipeline.push({
        $group: {
          _id: '$batchKey',
          message: { $first: '$message' },
          read: { $min: '$read' }, // nếu 1 tin chưa đọc thì coi là chưa đọc
          createdAt: { $first: '$createdAt' },
          targetType: { $first: '$targetType' },
          targetId: { $first: '$targetId' },
          department: { $first: { $arrayElemAt: ['$department', 0] } },
          position: { $first: { $arrayElemAt: ['$position', 0] } },
        },
      });
    }

    // --- Sắp xếp ---
    pipeline.push({ $sort: { createdAt: -1 } });

    // --- Chọn field cần thiết ---
    pipeline.push({
      $project: {
        _id: 1,
        message: 1,
        read: 1,
        createdAt: 1,
        updatedAt: 1,
        targetType: 1,
        targetId: 1,
        'user.fullName': 1,
        'user.email': 1,
        'department.name': 1,
        'position.title': 1,
      },
    });

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

  async sendToEmployees(
    employeeIds: string[],
    message: string,
    type?: NotificationType.MESSAGE,
  ) {
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
      type,
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
