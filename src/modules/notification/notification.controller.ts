import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.notificationService.findByUser(userId);
  }

  @Get('department/:departmentId')
  findByDepartment(@Param('departmentId') departmentId: string) {
    return this.notificationService.findByDepartment(departmentId);
  }

  @Get('position/:positionId')
  findByPosition(@Param('positionId') positionId: string) {
    return this.notificationService.findByPosition(positionId);
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
