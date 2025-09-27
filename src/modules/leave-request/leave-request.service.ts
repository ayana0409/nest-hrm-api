import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { DateHelper } from '@/common/helpers/dateHelper';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import { LeaveRequest, LeaveRequestDocument } from './schema/leave-request.schema';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { NotFoundException } from '@/common/exception/custom.exception';
import * as employeeSchema from '../employee/schema/employee.schema';

@Injectable()
export class LeaveRequestService {
  constructor(
    @InjectModel(LeaveRequest.name) private leaveModel: Model<LeaveRequestDocument>,
    @InjectModel(employeeSchema.Employee.name) private readonly employeeModel: employeeSchema.EmployeeModel,
  ) { }

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Đảm bảo startDate < endDate
    dto.startDate = DateHelper.toZoned(new Date(dto.startDate)).toISOString();
    dto.endDate = DateHelper.toZoned(new Date(dto.endDate)).toISOString();

    await this.employeeModel.checkExist(dto.employeeId.toString());
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }
    return this.leaveModel.create(dto);
  }

  async findByEmployeeToday(employeeId: string) {
    const { start, end } = DateHelper.getTodayRange();
    return this.leaveModel.findOne({
      employeeId,
      startDate: { $lte: end },
      endDate: { $gte: start },
    });
  }

  async findByEmployee(employeeId: string) {
    return this.leaveModel.find({ employeeId }).sort({ startDate: -1 });
  }

  async updateStatus(id: string, status: LeaveRequestStatus) {
    // Validate status
    if (!Object.values(LeaveRequestStatus).includes(status as LeaveRequestStatus)) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    var result = await this.leaveModel.findByIdAndUpdate(id, { status }, { new: true }).lean();
    if (!result)
      throw new NotFoundException('Leave request not found', "LEAVE_REQUEST_NOT_FOUND");

    return result;
  }

  async update(dto: UpdateLeaveRequestDto, id: string) {
    if (dto.startDate)
      dto.startDate = DateHelper.toZoned(new Date(dto.startDate)).toISOString();

    if (dto.endDate)
      dto.endDate = DateHelper.toZoned(new Date(dto.endDate)).toISOString();

    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate)
      throw new BadRequestException('startDate must be before endDate');

    var leave = await this.leaveModel.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!leave)
      throw new NotFoundException('Leave request not found', "LEAVE_REQUEST_NOT_FOUND");

    return leave;
  }

  async remove(id: string) {
    var result = this.leaveModel.findByIdAndDelete(id);
    if (!result)
      throw new NotFoundException('Leave request not found');

    return result;
  }
}
