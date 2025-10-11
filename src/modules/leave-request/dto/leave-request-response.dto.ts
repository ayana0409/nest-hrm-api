import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { formatDateToYMD } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';
import { LeaveEmployeeDto } from './leave-employee.dto';

export class LeaveRequestResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  reason: string;

  @Expose()
  @Transform(({ obj }) => formatDateToYMD(obj.startDate?.toString()))
  startDate: Date;

  @Expose()
  @Transform(({ obj }) => formatDateToYMD(obj.endDate?.toString()))
  endDate: Date;

  @Expose()
  status: LeaveRequestStatus;

  @Expose()
  employee: LeaveEmployeeDto;

  @Expose()
  department?: { name: string };

  @Expose()
  position: { title: string; level: string };
}
