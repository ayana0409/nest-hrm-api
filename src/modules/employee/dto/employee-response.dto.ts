import { Exclude, Expose, Transform, Type } from 'class-transformer';
import { EmpDepartmentDto } from './emp-department.dto';
import { EmpPositionDto } from './emp-position.dto';
import { formatDateToYMD } from '@/common/helpers/dateHelper';

export class EmployeeResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

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
  startDate?: Date;

  @Expose()
  endDate?: Date;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
