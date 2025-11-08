import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from '../notification.service';
import {
  LeaveRequestEventEnum,
  LeaveRequestUpdatedPayload,
} from '@/common/event/leave-request.event';

@Injectable()
export class LeaveRequestUpdatedListener {
  constructor(private readonly notificationService: NotificationService) {}

  @OnEvent(LeaveRequestEventEnum.Update)
  async handle(event: LeaveRequestUpdatedPayload) {
    await this.notificationService.sendToEmployees(
      [event.employeeId],
      `Your leave request has been updated: ${event.status}`,
    );
  }
}
