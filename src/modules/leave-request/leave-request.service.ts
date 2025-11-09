import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { DateHelper } from '@/common/helpers/dateHelper';
import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage, Types } from 'mongoose';
import { CreateLeaveRequestDto } from './dto/create-leave-request.dto';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from './schema/leave-request.schema';
import { UpdateLeaveRequestDto } from './dto/update-leave-request.dto';
import { NotFoundException } from '@/common/exception/custom.exception';
import * as employeeSchema from '../employee/schema/employee.schema';
import { plainToInstance } from 'class-transformer';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import { LeaveRequestResponseDto } from './dto/leave-request-response.dto';
import { paginateAggregate } from '@/common/helpers/paginationHelper';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  LeaveRequestEventEnum,
  LeaveRequestUpdatedPayload,
} from '../../common/event/leave-request.event';
import { AuditAction, AuditEvent } from '@/common/event/audit-log.event';

@Injectable()
export class LeaveRequestService {
  private readonly MODULE_NAME = 'leave-request';
  constructor(
    @InjectModel(LeaveRequest.name)
    private leaveModel: Model<LeaveRequestDocument>,
    @InjectModel(employeeSchema.Employee.name)
    private readonly employeeModel: employeeSchema.EmployeeModel,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(dto: CreateLeaveRequestDto): Promise<LeaveRequest> {
    // Đảm bảo startDate < endDate
    dto.startDate = DateHelper.toZoned(new Date(dto.startDate)).toISOString();
    dto.endDate = DateHelper.toZoned(new Date(dto.endDate)).toISOString();

    await this.employeeModel.checkExist(dto.employeeId);
    if (dto.startDate > dto.endDate) {
      throw new BadRequestException('startDate must be before endDate');
    }
    const result = await this.leaveModel.create(dto);
    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.CREATE,
      entityId: result._id,
      data: dto,
    });
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
    const selectFields = getDtoSelect(LeaveRequestResponseDto);
    const docs = await this.leaveModel
      .find({ employeeId })
      .sort({ startDate: -1 })
      .select(selectFields)
      .lean();
    return plainToInstance(LeaveRequestResponseDto, docs, {
      excludeExtraneousValues: true,
    });
  }

  async findPagedLeaveRequest(
    current = 1,
    pageSize = 10,
    filter?: {
      startDate?: string;
      endDate?: string;
      employeeId?: string;
      status?: LeaveRequestStatus;
    },
  ) {
    const pipeline: PipelineStage[] = [];

    // --- Filter động ---
    const match: any = {};
    if (filter?.startDate || filter?.endDate) {
      match.startDate = {};
      if (filter.startDate) match.startDate.$gte = new Date(filter.startDate);
      if (filter.endDate) match.startDate.$lte = new Date(filter.endDate);
    }
    if (filter?.employeeId)
      match.employeeId = new Types.ObjectId(filter.employeeId);
    if (filter?.status) match.status = filter.status;
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    // --- Ép employeeId từ string sang ObjectId ---
    pipeline.push({
      $addFields: {
        employeeId: { $toObjectId: '$employeeId' },
      },
    });

    // --- Join các bảng ---
    pipeline.push(
      {
        $lookup: {
          from: 'employees',
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: { path: '$employee', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'departments',
          localField: 'employee.departmentId',
          foreignField: '_id',
          as: 'department',
        },
      },
      { $unwind: { path: '$department', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'positions',
          localField: 'employee.positionId',
          foreignField: '_id',
          as: 'position',
        },
      },
      { $unwind: { path: '$position', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          startDate: 1,
          endDate: 1,
          reason: 1,
          status: 1,
          'employee.fullName': 1,
          'employee.phone': 1,
          'department.name': 1,
          'position.title': 1,
          'position.level': 1,
        },
      },
    );

    // --- Gọi paginate ---
    return paginateAggregate<LeaveRequestResponseDto>(
      this.leaveModel,
      pipeline,
      current,
      pageSize,
      { dtoClass: LeaveRequestResponseDto },
    );
  }

  async updateStatus(id: string, status: LeaveRequestStatus) {
    // Validate status
    if (
      !Object.values(LeaveRequestStatus).includes(status as LeaveRequestStatus)
    ) {
      throw new BadRequestException(`Invalid status: ${status}`);
    }

    var result = await this.leaveModel
      .findByIdAndUpdate(id, { status }, { new: true })
      .lean();
    if (!result)
      throw new NotFoundException(
        'Leave request not found',
        'LEAVE_REQUEST_NOT_FOUND',
      );

    this.eventEmitter.emit(
      LeaveRequestEventEnum.Update,
      new LeaveRequestUpdatedPayload(id, result.employeeId.toString(), status),
    );

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: id,
      data: status,
    });

    return result;
  }

  async update(dto: UpdateLeaveRequestDto, id: string) {
    if (dto.startDate)
      dto.startDate = DateHelper.toZoned(new Date(dto.startDate)).toISOString();

    if (dto.endDate)
      dto.endDate = DateHelper.toZoned(new Date(dto.endDate)).toISOString();

    if (dto.startDate && dto.endDate && dto.startDate > dto.endDate)
      throw new BadRequestException('startDate must be before endDate');

    var leave = await this.leaveModel
      .findByIdAndUpdate(id, dto, { new: true })
      .lean();
    if (!leave)
      throw new NotFoundException(
        'Leave request not found',
        'LEAVE_REQUEST_NOT_FOUND',
      );

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: id,
      data: dto,
    });

    return leave;
  }

  async remove(id: string) {
    var result = this.leaveModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Leave request not found');

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.DELETE,
      entityId: id,
    });

    return result;
  }
}
