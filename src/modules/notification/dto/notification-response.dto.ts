import { DateHelper } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';

export class NotificationResponseDto {
  @Expose()
  @Transform(({ obj }) => obj._id?.toString())
  _id: string;

  @Expose()
  message: string;

  @Expose()
  type: string;

  @Expose()
  @Transform(({ obj }) => (obj.user ? obj.user.username : null))
  username?: string;

  @Expose()
  targets?: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.createdAt ? DateHelper.format(obj.createdAt) : null,
  )
  createdAt: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.updatedAt ? DateHelper.format(obj.updatedAt) : null,
  )
  updatedAt: string;

  @Expose()
  read: boolean;
}
