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
import { CreateAppNotificationDto } from './dto/create-app-notification.dto';
import { UpdateAppNotificationDto } from './dto/update-app-notification.dto';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post()
  create(@Body() dto: CreateAppNotificationDto) {
    return this.notificationService.create(dto);
  }

  @Get('user/:userId')
  findByUser(@Param('userId') userId: string) {
    return this.notificationService.findByUser(userId);
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

  // Gửi cho user theo position và department
  @Post('send/position-department')
  sendToPositionAndDepartment(
    @Body() body: { position: string; department: string; message: string },
  ) {
    return this.notificationService.sendToPositionAndDepartment(
      body.position,
      body.department,
      body.message,
    );
  }
}
