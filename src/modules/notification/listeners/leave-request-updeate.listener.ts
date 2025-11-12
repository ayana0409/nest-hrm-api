import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../notification.service';
import {
  LeaveRequestEventEnum,
  LeaveRequestUpdatedPayload,
} from '@/common/event/leave-request.event';
import { NotificationType } from '@/common/enum/notification-type.enum';
import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';

@Injectable()
export class LeaveRequestUpdatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(LeaveRequestEventEnum.Update)
  async handle(event: LeaveRequestUpdatedPayload) {
    await this.notificationService.sendToEmployees(
      [event.employeeId],
      `Your leave request has been updated: ${event.status}`,
      event.status === LeaveRequestStatus.Approved
        ? NotificationType.INFO
        : NotificationType.WARNING,
    );
  }
}
