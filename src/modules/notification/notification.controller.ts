import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';
import { PagedNotificationRequestDto } from './dto/paged-notification-request.dto';
import { string } from '@tensorflow/tfjs';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('paged')
  async findPagedNotifications(@Query() query: PagedNotificationRequestDto) {
    const { current, pageSize, ...filter } = query;
    return this.notificationService.findPagedNotifications(
      current,
      pageSize,
      filter,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.notificationService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateAppNotificationDto) {
    return this.notificationService.update(id, dto);
  }

  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.notificationService.markAsRead(id);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.notificationService.remove(id);
  }

  @Post('send/employees')
  async sendToEmployees(
    @Body()
    body: {
      employeeIds: string[];
      message: string;
    },
  ) {
    return this.notificationService.sendToEmployees(
      body.employeeIds,
      body.message,
    );
  }

  @Post('send/departments')
  async sendToDepartments(
    @Body()
    body: {
      departmentIds: string[];
      message: string;
    },
  ) {
    return this.notificationService.sendToDepartments(
      body.departmentIds,
      body.message,
    );
  }

  @Post('send/positions')
  async sendToPositions(
    @Body()
    body: {
      positionIds: string[];
      message: string;
    },
  ) {
    return this.notificationService.sendToPositions(
      body.positionIds,
      body.message,
    );
  }
}
