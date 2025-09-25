import { Expose, Transform } from 'class-transformer';

export class PositionResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  title: string;

  @Expose()
  level?: string;

  @Expose()
  salary?: number;

  @Expose()
  description?: string;
}
