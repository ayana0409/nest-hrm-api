import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as employeeSchema from '../employee/schema/employee.schema';
import { Salary, SalaryDocument } from './schema/salary.schema';
import {
  Attendance,
  AttendanceDocument,
} from '../attendance/schema/attendance.schema';
import {
  LeaveRequest,
  LeaveRequestDocument,
} from '../leave-request/schema/leave-request.schema';
import { plainToInstance, Type } from 'class-transformer';
import { EmployeeSalaryDto } from './dto/employee-salary.dto';
import { getDtoSelect } from '@/common/helpers/dtoHelper';
import { EmpSalaryDepartmentDto } from './dto/emp-salary-department.dto';
import { EmpSalaryPositionDto } from './dto/emp-salary-position.dto';
import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { AttendanceService } from '../attendance/attendance.service';
import { ConfigService } from '@nestjs/config';
import { toDto } from '@/common/helpers/transformHelper';
import { paginate } from '@/common/helpers/paginationHelper';
import aqp from 'api-query-params';
import { runWithConcurrency } from '@/common/helpers/promise.helper';
import { EmployeeStatusEnum } from '@/common/enum/employee-status..enum';
import SalaryResponse from './dto/salary-response';
import { DateHelper } from '@/common/helpers/dateHelper';

@Injectable()
export class SalaryService {
  private readonly WORK_DAYS_PER_MONTH: number;
  private readonly WORK_HOURS_PER_DAY: number;
  private readonly OVERTIME_RATE: number;
  private readonly LATE_PENALTY_PER_MINUTE: number;
  private readonly ABSENCE_PENALTY_PER_DAY: number;
  private readonly BONUS_WHEN_NO_LEAVE: number;
  private readonly MAX_GENERATE_QUEUE: number;

  constructor(
    private readonly configService: ConfigService,
    private readonly attendanceService: AttendanceService,
    @InjectModel(Salary.name)
    private readonly salaryModel: Model<SalaryDocument>,
    @InjectModel(employeeSchema.Employee.name)
    private readonly employeeModel: employeeSchema.EmployeeModel,
    @InjectModel(Attendance.name)
    private attendanceModel: Model<AttendanceDocument>,
    @InjectModel(LeaveRequest.name)
    private leaveModel: Model<LeaveRequestDocument>,
  ) {
    this.WORK_DAYS_PER_MONTH = +this.configService.get(
      'WORK_DAYS_PER_MONTH',
      26,
    );
    this.WORK_HOURS_PER_DAY = +this.configService.get('WORK_HOURS_PER_DAY', 8);
    this.OVERTIME_RATE = +this.configService.get('OVERTIME_RATE', 1.5);
    this.LATE_PENALTY_PER_MINUTE = +this.configService.get(
      'LATE_PENALTY_PER_MINUTE',
      2000,
    );
    this.ABSENCE_PENALTY_PER_DAY = +this.configService.get(
      'ABSENCE_PENALTY_PER_DAY',
      300000,
    );
    this.BONUS_WHEN_NO_LEAVE = +this.configService.get(
      'BONUS_WHEN_NO_LEAVE',
      500000,
    );
    this.MAX_GENERATE_QUEUE = +this.configService.get('MAX_GENERATE_QUEUE', 10);
  }

  private async checkEmployeeExist(employeeId: string) {
    if (!Types.ObjectId.isValid(employeeId)) {
      throw new BadRequestException('Invalid employeeId');
    }
    const employee = await this.employeeModel.findById(employeeId);
    if (!employee) {
      throw new NotFoundException('Employee not found');
    }
  }

  async delete(id: string): Promise<void> {
    const res = await this.salaryModel.findByIdAndDelete(id);
    if (!res) throw new NotFoundException('Salary not found');
  }

  async findByEmployeeId(employeeId: string): Promise<Salary[]> {
    await this.checkEmployeeExist(employeeId);
    return this.salaryModel.find({ employeeId }).exec();
  }
  async findAll(query: string, current = 1, pageSize = 10) {
    const { filter, sort } = aqp(query);
    delete filter.current;
    delete filter.pageSize;

    const selectFields = getDtoSelect(SalaryResponse);
    return paginate<SalaryResponse>(
      this.salaryModel,
      filter,
      sort,
      selectFields,
      current,
      pageSize,
      {
        dtoClass: SalaryResponse,
      },
    );
  }

  async findByMonth(month: string): Promise<Salary[]> {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new BadRequestException('Month must be in format YYYY-MM');
    }
    return this.salaryModel.find({ month }).populate('employeeId').exec();
  }

  async generateSalaryForEmployee(employeeId: string, month: string) {
    const formatedMonth = DateHelper.format(new Date(month), 'yyyy-MM');
    const salaryData = await this.getEmployeeSalary(employeeId, formatedMonth);

    const result = await this.salaryModel.findOneAndUpdate(
      {
        employeeId: new Types.ObjectId(employeeId),
        month: formatedMonth,
      },
      salaryData,
      { new: true, upsert: true },
    );

    return result;
  }

  async generateSalaryForEmployees(employeeIds: string[], month: string) {
    await runWithConcurrency(
      employeeIds,
      this.MAX_GENERATE_QUEUE,
      async (employeeId) => {
        try {
          await this.generateSalaryForEmployee(employeeId, month);
        } catch (error) {
          if (error instanceof NotFoundException) return; // skip when employee not found
          throw error; // re-throw other errors
        }
      },
    );

    return {
      statusCode: HttpStatus.CREATED,
      message: 'Salaries generated successfully',
    };
  }

  async generateForAllEmoployees(month: string) {
    const employees = await this.employeeModel
      .find({ status: EmployeeStatusEnum.Active })
      .select('_id')
      .lean();
    const ids = employees.map((e) => e._id.toString());
    return this.generateSalaryForEmployees(ids, month);
  }

  async generateForDepartment(departmentIds: string[], month: string) {
    // get employee ids
    const employees = await this.employeeModel
      .find({
        departmentId: {
          $in: departmentIds.map((id) => new Types.ObjectId(id)),
        },
        status: EmployeeStatusEnum.Active,
      })
      .select('_id')
      .lean();
    const ids = employees.map((e) => e._id.toString());

    return this.generateSalaryForEmployees(ids, month);
  }

  private async getEmployeeSalary(
    employeeId: string,
    month: string,
  ): Promise<Salary> {
    const { start, end } = this.getMonthRange(month);

    const selectFields = getDtoSelect(EmployeeSalaryDto).join(' ');
    const employee = await this.employeeModel
      .findById(employeeId)
      .select(selectFields)
      .populate('departmentId', getDtoSelect(EmpSalaryDepartmentDto))
      .populate('positionId', getDtoSelect(EmpSalaryPositionDto))
      .exec();

    if (!employee)
      throw new NotFoundException('Employee not found', 'EMPLOYEE_NOT_FOUND');

    // tính tổng số ngày nghỉ
    const acceptedLeave = await this.leaveModel
      .find({
        employeeId,
        status: LeaveRequestStatus.Approved,
        startDate: { $lt: end },
        endDate: { $gte: start },
      })
      .exec();

    let totalLeaveDays = 0;
    for (const leave of acceptedLeave) {
      totalLeaveDays += this.calculateLeaveDaysInRange(
        leave.startDate.toISOString(),
        leave.endDate.toISOString(),
        start.toISOString(),
        end.toISOString(),
      );
    }

    // tính số ngày làm việc
    const workingDates = await this.attendanceService.calculateWorkingDays(
      new Types.ObjectId(employeeId),
      start,
      end,
    );

    const {
      fullDay,
      overTimeHours,
      lateMinutes,
      halfDay,
      absentDay,
      totalDay,
    } = workingDates;

    // tính lương
    let dto = toDto(EmployeeSalaryDto, employee) as EmployeeSalaryDto;

    let baseSalary = 0;
    if (dto.position && dto.position.salary) {
      baseSalary = dto.position.salary;
    }
    const hourlyRate =
      baseSalary / (this.WORK_DAYS_PER_MONTH * this.WORK_HOURS_PER_DAY);

    const bonus = Math.max(
      Math.ceil(
        overTimeHours * hourlyRate * this.OVERTIME_RATE +
          (totalLeaveDays === 0 ? this.BONUS_WHEN_NO_LEAVE : 0),
      ),
      0,
    );

    const deductions = Math.max(
      Math.ceil(
        lateMinutes * this.LATE_PENALTY_PER_MINUTE +
          absentDay * this.ABSENCE_PENALTY_PER_DAY,
      ),
      0,
    );

    const netSalary = Math.max(totalDay * hourlyRate + bonus - deductions, 0);

    const result = Object.assign(new Salary(), {
      employeeId: new Types.ObjectId(employeeId),
      month,
      fullName: employee.fullName,
      department: dto.department?.name || '',
      position: dto.position?.title || '',
      level: dto.position?.level || '',
      workDates: totalDay,
      offDates: totalLeaveDays,
      oTHours: overTimeHours,
      lateMinutes,
      absenceDays: absentDay,
      baseSalary,
      bonus,
      deductions,
      netSalary,
    });

    return result;
  }

  private getMonthRange(month: string) {
    const [y, m] = month.split('-').map(Number);
    const start = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0));
    const end = new Date(Date.UTC(y, m, 1, 0, 0, 0));
    return { start, end };
  }

  /**
   * Tính số ngày nghỉ nằm trong khoảng truyền vào
   * @param leaveStartStr Ngày bắt đầu nghỉ (yyyy/MM/dd)
   * @param leaveEndStr Ngày kết thúc nghỉ (yyyy/MM/dd)
   * @param rangeStartStr Ngày bắt đầu khoảng cần tính (yyyy/MM/dd)
   * @param rangeEndStr Ngày kết thúc khoảng cần tính (yyyy/MM/dd)
   */
  private calculateLeaveDaysInRange(
    leaveStartStr: string,
    leaveEndStr: string,
    rangeStartStr: string,
    rangeEndStr: string,
  ): number {
    const leaveStart = new Date(leaveStartStr);
    const leaveEnd = new Date(leaveEndStr);
    const rangeStart = new Date(rangeStartStr);
    const rangeEnd = new Date(rangeEndStr);

    // lấy phần giao nhau
    const effectiveStart = leaveStart > rangeStart ? leaveStart : rangeStart;
    const effectiveEnd = leaveEnd < rangeEnd ? leaveEnd : rangeEnd;

    if (effectiveEnd < effectiveStart) return 0; // không có giao nhau

    // chuẩn hóa giờ
    effectiveStart.setHours(0, 0, 0, 0);
    effectiveEnd.setHours(0, 0, 0, 0);

    const diffMs = effectiveEnd.getTime() - effectiveStart.getTime();
    return Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
  }
}
