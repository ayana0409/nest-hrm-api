import { Exclude, Expose, Transform } from 'class-transformer';
import { UserEmployeeDto } from './user-employee.dto';

export class UserResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString()) // map từ ObjectId sang string
  _id: string;

  @Expose()
  readonly username: string;

  @Expose()
  readonly role?: string;

  @Expose()
  employeeId?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.employeeId
      ? {
          id: obj.employeeId._id?.toString(),
          fullName: obj.employeeId.fullName,
          email: obj.employeeId.email,
          phone: obj.employeeId.phone,
        }
      : null,
  )
  employee?: UserEmployeeDto;

  @Expose()
  readonly active?: boolean;

  @Expose()
  readonly createdAt: Date;

  @Expose()
  readonly updatedAt: Date;

  @Exclude()
  readonly password: string;
}
