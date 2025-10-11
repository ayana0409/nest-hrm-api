import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
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
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequestService } from './leave-request.service';

@Controller('leave-request')
export class LeaveRequestController {
  constructor(private readonly leaveService: LeaveRequestService) {}

  @Post()
  create(@Body() dto: CreateLeaveRequestDto) {
    return this.leaveService.create(dto);
  }

  @Get('today/:employeeId')
  findToday(@Param('employeeId') employeeId: string) {
    return this.leaveService.findByEmployeeToday(employeeId);
  }

  @Patch(':id/status/:status')
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: LeaveRequestStatus,
  ) {
    return this.leaveService.updateStatus(id, status);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: Partial<CreateLeaveRequestDto>) {
    return this.leaveService.update(dto, id);
  }

  @Get('employee/:employeeId')
  findByEmployee(@Param('employeeId') employeeId: string) {
    return this.leaveService.findByEmployee(employeeId);
  }

  @Get()
  findPagedLeaveRequest(
    @Query('current') current = 1,
    @Query('pageSize') pageSize = 10,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('employeeId') employeeId?: string,
    @Query('status') status?: LeaveRequestStatus,
  ) {
    return this.leaveService.findPagedLeaveRequest(+current, +pageSize, {
      startDate,
      endDate,
      employeeId,
      status,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.leaveService.remove(id);
  }
}
