import { DateHelper } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';

export class AttendanceResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  id: string;

  @Expose()
  date: Date;

  @Expose()
  fullName: string;

  @Expose()
  @Transform(({ obj }) => (obj.checkIn ? DateHelper.format(obj.checkIn) : null))
  checkIn?: Date;

  @Expose()
  @Transform(({ obj }) =>
    obj.checkOut ? DateHelper.format(obj.checkOut) : null,
  )
  checkOut?: Date;

  @Expose()
  status?: string;

  @Expose()
  note?: string;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;
}
