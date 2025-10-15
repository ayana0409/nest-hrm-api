import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { EmpDepartmentDto } from './emp-department.dto';
import { EmpPositionDto } from './emp-position.dto';
import { DateHelper, formatDateToYMD } from '@/common/helpers/dateHelper';

export class EmployeeResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  avatarUrl?: string;

  @Expose()
  phone?: string;

  @Expose()
  @Transform(({ obj }) => formatDateToYMD(obj.dob?.toString()))
  dob?: Date;

  @Expose()
  gender?: string;

  @Expose()
  address?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.departmentId
      ? { id: obj.departmentId._id?.toString(), name: obj.departmentId.name }
      : null,
  )
  department?: EmpDepartmentDto;

  @Expose()
  @Transform(({ obj }) =>
    obj.positionId
      ? {
          id: obj.positionId._id?.toString(),
          title: obj.positionId.title,
          level: obj.positionId.level,
          salary: obj.positionId.salary,
        }
      : null,
  )
  position?: EmpPositionDto;

  @Expose()
  status?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.startDate ? DateHelper.format(obj.startDate, 'yyyy-MM-dd') : null,
  )
  startDate?: Date;

  @Expose()
  @Transform(({ obj }) =>
    obj.endDate ? DateHelper.format(obj.endDate, 'yyyy-MM-dd') : null,
  )
  endDate?: Date;

  @Expose()
  @Transform(({ obj }) =>
    obj.createdAt ? DateHelper.format(obj.createdAt) : null,
  )
  createdAt: Date;

  @Expose()
  @Transform(({ obj }) =>
    obj.updatedAt ? DateHelper.format(obj.updatedAt) : null,
  )
  updatedAt: Date;
}
