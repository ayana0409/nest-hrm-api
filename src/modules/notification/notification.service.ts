import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';
import {
  AppNotificationDocument,
  AppNotification,
} from './schema/app-notification.schema';
import { Employee, EmployeeDocument } from '../employee/schema/employee.schema';
import { NotificationGateway } from './notification.gateway';
import { randomUUID } from 'crypto';
import { NotificationType } from '@/common/enum/notification-type.enum';

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

  async findByUser(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
  }

  async findByPosition(positionId: string) {
    return this.notificationModel.aggregate([
      {
        $match: {
          targetType: NotificationType.POSITION,
          targetId: new Types.ObjectId(positionId),
        },
      },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$batchKey', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
  }

  async findByDepartment(departmentId: string) {
    return this.notificationModel.aggregate([
      {
        $match: {
          targetType: NotificationType.DEPARTMENT,
          targetId: new Types.ObjectId(departmentId),
        },
      },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$batchKey', doc: { $first: '$$ROOT' } } },
      { $replaceRoot: { newRoot: '$doc' } },
    ]);
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

  async sendToEmployees(employeeIds: string[], message: string) {
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
      targetType: NotificationType.INDIVIDUAL,
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
      NotificationType.DEPARTMENT,
    );
  }

  async sendToPositions(positionIds: string[], message: string) {
    return this.sendToEmployeesByField(
      'positionId',
      positionIds,
      message,
      NotificationType.POSITION,
    );
  }

  private async sendToEmployeesByField(
    field: 'departmentId' | 'positionId',
    ids: string[],
    message: string,
    targetType: NotificationType.DEPARTMENT | NotificationType.POSITION,
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
