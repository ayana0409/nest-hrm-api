import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';

@Controller('attendance')
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Post()
  create(@Body() createAttendanceDto: CreateAttendanceDto) {
    return this.attendanceService.create(createAttendanceDto);
  }

  @Get()
  findAll(
    @Query() query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.attendanceService.findAll(query, +current, +pageSize);
  }

  @Get('employee/:id')
  findAllByEmpId(
    @Query() query: string,
    @Query('current') current: number,
    @Query('pageSize') pageSize: number,
  ) {
    return this.attendanceService.findAllById(query, +current, +pageSize);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.attendanceService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateAttendanceDto: UpdateAttendanceDto,
  ) {
    return this.attendanceService.update(id, updateAttendanceDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.attendanceService.remove(id);
  }

  @Post('check-in-or-out/:employeeId')
  async toggleCheckInOut(@Param('employeeId') employeeId: string) {
    return this.attendanceService.checkInOrOut(employeeId);
  }

  @Post('image')
  async toggleCheckInOutImage(@Body() body: { image: string }) {
    return this.attendanceService.processAttendance(body.image);
  }
}
