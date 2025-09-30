import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../user/schema/user.schema';
import { CreateAppNotificationDto } from './dto/create-app-notification.dto';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';
import {
  AppNotificationDocument,
  AppNotification,
} from './schema/app-notification.schema';
import { Employee, EmployeeDocument } from '../employee/schema/employee.schema';
import { NotificationGateway } from './notification.gateway';

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

  async create(dto: CreateAppNotificationDto) {
    var result = await this.notificationModel.create(dto);
    if (result)
      this.notificationGateway.sendNotificationToUser(
        dto.userId.toString(),
        dto.message,
      );

    return result;
  }

  async findByUser(userId: string) {
    return this.notificationModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 });
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

  async sendToPositionAndDepartment(
    positionId: string,
    departmentId: string,
    message: string,
  ) {
    const query: Record<string, any> = {};
    if (positionId) query.positionId = new Types.ObjectId(positionId);

    if (departmentId) query.departmentId = new Types.ObjectId(departmentId);

    const employees = await this.employeeModel.find(query).select('_id').lean();
    const employeeIds = employees.map((e) => e._id);

    const users = await this.userModel
      .find({ employeeId: { $in: employeeIds } })
      .lean();

    if (!users.length) return [];

    const notifications = users.map((u) => ({
      userId: u._id,
      message,
    }));

    const result = this.notificationModel.insertMany(notifications, {
      lean: true,
    });

    users.forEach((u) => {
      this.notificationGateway.sendNotificationToUser(
        u._id.toString(),
        message,
      );
    });

    return result;
  }
}
