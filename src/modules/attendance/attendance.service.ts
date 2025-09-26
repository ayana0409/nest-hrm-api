import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { UpdateAttendanceDto } from './dto/update-attendance.dto';
import { paginate } from '@/common/helpers/paginationHelper';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { Employee, EmployeeDocument } from '../employee/schema/employee.schema';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { Attendance, AttendanceDocument } from './schema/attendance.schema';
import { Model } from 'mongoose';

@Injectable()
export class AttendanceService {
  constructor(
    @InjectModel(Attendance.name) private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name) private readonly employeeModel: Model<EmployeeDocument>,
  ) { }

  async create(createDto: CreateAttendanceDto) {
    // Validate employeeId
    if (createDto.employeeId) {
      await this.validateEmployee(createDto.employeeId);
    }

    const attendance = await this.attendanceModel.create(createDto);
    return attendance.toJSON();
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    return paginate<AttendanceResponseDto>(
      this.attendanceModel,
      filter,
      sort,
      [],
      current,
      pageSize
    );
  }

  async findOne(id: string) {
    const att = await this.attendanceModel.findById(id).lean();
    if (!att) throw new NotFoundException(`Attendance ${id} not found`);
    return att;
  }

  async update(id: string, updateDto: Partial<CreateAttendanceDto>) {
    if (updateDto.employeeId) {
      await this.validateEmployee(updateDto.employeeId);
    }

    const att = await this.attendanceModel
      .findByIdAndUpdate(id, updateDto, { new: true })
      .lean();

    if (!att) throw new NotFoundException(`Attendance ${id} not found`);
    return att;
  }

  async remove(id: string) {
    const result = await this.attendanceModel.findByIdAndDelete(id).lean();
    if (!result) throw new NotFoundException(`Attendance ${id} not found`);
    return result;
  }

  private async validateEmployee(employeeId: string) {
    const exists = await this.employeeModel.exists({ _id: employeeId });
    if (!exists)
      throw new NotFoundException(`Employee ${employeeId} not found`);
  }
}

