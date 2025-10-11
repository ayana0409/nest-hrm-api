import { Expose, Transform } from 'class-transformer';

export class LeaveEmployeeDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  fullName: string;

  @Expose()
  email: string;

  @Expose()
  phone?: string;
}
