import { Expose, Transform } from 'class-transformer';

export class DepartmentResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  name: string;

  @Expose()
  description?: string;
}
