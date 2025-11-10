import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateAttendanceDto } from './dto/create-attendance.dto';
import { paginate, paginateAggregate } from '@/common/helpers/paginationHelper';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { Employee, EmployeeDocument } from '../employee/schema/employee.schema';
import { AttendanceResponseDto } from './dto/attendance-response.dto';
import { Attendance, AttendanceDocument } from './schema/attendance.schema';
import { Model, PipelineStage, Types } from 'mongoose';
import { AttendanceStatus } from '@/common/enum/attendance-status.enum';
import { DateHelper } from '@/common/helpers/dateHelper';
import { EmpAttendanceDto } from './dto/emp-attendance.dto';
import { ConfigService } from '@nestjs/config';
import { EmpFaceService } from '@/services/face/emp-face.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { AuditEvent, AuditAction } from '@/common/event/audit-log.event';

@Injectable()
export class AttendanceService {
  private readonly LATE_THRESHOLD_MINUTES: number;
  private readonly WORK_START_HOUR: number;
  private readonly WORK_END_HOUR: number;
  private readonly MODULE_NAME = 'department';

  last: number;
  constructor(
    private readonly configService: ConfigService,
    @InjectModel(Attendance.name)
    private readonly attendanceModel: Model<AttendanceDocument>,
    @InjectModel(Employee.name)
    private readonly employeeModel: Model<EmployeeDocument>,
    private readonly empFaceDetectionService: EmpFaceService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.LATE_THRESHOLD_MINUTES = +this.configService.get(
      'LATE_THRESHOLD_MINUTES',
      15,
    );
    this.WORK_START_HOUR = +this.configService.get('WORK_START_HOUR', 9);
    this.WORK_END_HOUR = +this.configService.get('WORK_END_HOUR', 17);
  }

  async create(createDto: CreateAttendanceDto) {
    // Validate employeeId
    if (createDto.employeeId) {
      await this.validateEmployee(createDto.employeeId);
    }

    createDto.employeeId = new Types.ObjectId(createDto.employeeId);
    const attendance = await this.attendanceModel.create(createDto);

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.CREATE,
      entityId: attendance._id,
      data: createDto,
    });

    return attendance.toJSON();
  }

  async processAttendance(imageBase64: string) {
    const { employeeId, fullName } =
      await this.empFaceDetectionService.findBestMatchEmp(imageBase64);

    if (!employeeId) {
      throw new NotFoundException('No employee match');
    }

    try {
      const result = await this.checkInOrOut(employeeId);
      return {
        success: true,
        employeeId,
        fullName,
        action: result?.action || 'Unknown',
        message: 'Success',
      };
    } catch (error) {
      return {
        success: false,
        employeeId,
        fullName,
        action: 'Failed',
        message: error.message,
      };
    }
  }

  async checkInOrOut(employeeId: string) {
    const now = DateHelper.now();
    const { start, end } = DateHelper.getTodayRange();

    // Tìm attendance gần nhất trong ngày
    const latest = await this.attendanceModel
      .findOne({
        employeeId: new Types.ObjectId(employeeId),
        date: { $gte: start, $lte: end },
      })
      .sort({ createdAt: -1 })
      .exec();

    // Nếu không có → tạo mới (check-in)
    if (!latest) {
      const created = await this.attendanceModel.create({
        employeeId: new Types.ObjectId(employeeId),
        date: now,
        checkIn: now,
        status: AttendanceStatus.OnTime,
      });
      return { action: 'check-in', attendance: created };
    }

    // Nếu có rồi nhưng chưa check-out
    if (!latest.checkOut) {
      latest.checkOut = now;
      latest.status =
        now.getHours() > this.WORK_START_HOUR
          ? AttendanceStatus.Late
          : AttendanceStatus.CheckOut;
      // mark is half-day if check-in late > working hour / 2 and check-out early working hour / 2
      if (latest.checkIn) {
        const checkInMinutes =
          latest.checkIn.getHours() * 60 + latest.checkIn.getMinutes();
        const checkOutMinutes =
          latest.checkOut.getHours() * 60 + latest.checkOut.getMinutes();
        if (
          checkInMinutes - this.WORK_START_HOUR * 60 >
            (this.WORK_END_HOUR - this.WORK_START_HOUR) * 30 ||
          this.WORK_END_HOUR * 60 - checkOutMinutes >
            (this.WORK_END_HOUR - this.WORK_START_HOUR) * 30
        ) {
          latest.status = AttendanceStatus.HalfDay;
        }
      }
      await latest.save();
      return { action: 'check-out', attendance: latest };
    }

    // Nếu đã check-out rồi thì không cho tạo thêm
    throw new BadRequestException(
      'Bạn đã check-out hôm nay, không thể tạo thêm attendance.',
    );
  }

  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    return paginate<AttendanceResponseDto>(
      this.attendanceModel,
      filter,
      { createdAt: -1 },
      [],
      current,
      pageSize,
      {
        dtoClass: AttendanceResponseDto,
      },
    );
  }

  async findToday(fullName?: string, current = 1, pageSize = 10) {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    );
    todayEnd.setSeconds(todayEnd.getSeconds() - 1);

    const pipeline: PipelineStage[] = [
      {
        $match: {
          date: { $gte: todayStart, $lte: todayEnd },
        },
      },
      {
        $lookup: {
          from: 'employees', // tên collection của Employee
          localField: 'employeeId',
          foreignField: '_id',
          as: 'employee',
        },
      },
      { $unwind: '$employee' },
    ];

    if (fullName) {
      pipeline.push({
        $match: {
          'employee.fullName': { $regex: fullName, $options: 'i' },
        },
      });
    }

    pipeline.push(
      {
        $project: {
          _id: 1,
          employeeId: 1,
          checkIn: 1,
          checkOut: 1,
          status: 1,
          fullName: '$employee.fullName',
        },
      },
      {
        $sort: { updatedAt: -1 },
      },
    );

    return paginateAggregate<AttendanceResponseDto>(
      this.attendanceModel,
      pipeline,
      current,
      pageSize,
      {
        dtoClass: AttendanceResponseDto,
      },
    );
  }

  async findAllById(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    const employeeId = filter.id;
    delete filter.current;
    delete filter.pageSize;
    delete filter.fullName;
    delete filter.id;
    const finalFilter = { ...filter };
    finalFilter.employeeId = new Types.ObjectId(employeeId);

    return paginate<AttendanceResponseDto>(
      this.attendanceModel,
      finalFilter,
      { checkIn: -1 },
      [],
      current,
      pageSize,
      {
        dtoClass: AttendanceResponseDto,
      },
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

    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.UPDATE,
      entityId: id,
      data: updateDto,
    });

    return att;
  }

  async remove(id: string) {
    const result = await this.attendanceModel.findByIdAndDelete(id).lean();
    if (!result) throw new NotFoundException(`Attendance ${id} not found`);
    this.eventEmitter.emit(AuditEvent.Log, {
      module: this.MODULE_NAME,
      action: AuditAction.DELETE,
      entityId: id,
    });

    return result;
  }

  /**
   * Tính số ngày công theo trạng thái trong khoảng truyền vào
   * @param employeeId id nhân viên
   * @param startDate ngày bắt đầu (Date)
   * @param endDate ngày kết thúc (Date)
   */
  async calculateWorkingDays(
    employeeId: Types.ObjectId,
    startDate: Date,
    endDate: Date,
  ): Promise<EmpAttendanceDto> {
    const attendances = await this.attendanceModel
      .find({
        employeeId: employeeId,
        date: { $gte: startDate, $lte: endDate },
      })
      .exec();

    let fullDay = 0;
    let halfDay = 0;
    let absent = 0;
    let lateMinutes = 0;
    let overTimeHours = 0;

    // format attendance yyyy-MM-dd
    const attendanceMap = new Map<string, any>();
    for (const att of attendances) {
      const key = att.date.toISOString().split('T')[0];
      attendanceMap.set(key, att);
    }

    // Map for each day
    const current = new Date(startDate);
    while (current <= endDate) {
      const key = current.toISOString().split('T')[0];
      const att = attendanceMap.get(key);

      if (att) {
        // have data => caculate
        switch (att.status) {
          case AttendanceStatus.CheckOut:
            fullDay += 1;
            break;
          case AttendanceStatus.HalfDay:
            halfDay += 1;
            break;
          case AttendanceStatus.Absent:
            absent += 1;
            break;
          case AttendanceStatus.Late:
            fullDay += 1;
            if (att.checkIn) {
              const late =
                att.checkIn.getHours() * 60 +
                att.checkIn.getMinutes() -
                this.WORK_START_HOUR * 60;
              if (late > this.LATE_THRESHOLD_MINUTES) {
                lateMinutes += late;
              }
            }
            break;
          default:
            break;
        }

        if (att.checkOut) {
          const outHour =
            att.checkOut.getHours() + att.checkOut.getMinutes() / 60;
          if (outHour > this.WORK_END_HOUR) {
            overTimeHours += outHour - this.WORK_END_HOUR;
          }
        }
      } else {
        // no data => absent
        absent += 1;
      }

      // next date
      current.setDate(current.getDate() + 1);
    }

    const totalWorkDays = fullDay + halfDay * 0.5;

    return new EmpAttendanceDto({
      employeeId: employeeId.toString(),
      fullDay,
      halfDay,
      absentDay: absent,
      lateMinutes,
      overTimeHours: Math.round(overTimeHours),
      totalDay: totalWorkDays,
    });
  }

  private async validateEmployee(employeeId: Types.ObjectId) {
    const exists = await this.employeeModel.exists({ _id: employeeId });
    if (!exists)
      throw new NotFoundException(`Employee ${employeeId} not found`);
  }
}
