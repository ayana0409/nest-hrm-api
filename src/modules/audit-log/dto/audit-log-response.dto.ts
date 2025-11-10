import { DateHelper } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';

export class AuditLogResponseDto {
  @Expose()
  _id?: string;

  @Expose()
  userId?: string;

  @Expose()
  username?: string;

  @Expose()
  action: string;

  @Expose()
  module: string;

  @Expose()
  entityId: string;

  @Expose()
  @Transform(({ obj }) =>
    obj.timestamp ? DateHelper.format(obj.timestamp) : null,
  )
  timestamp?: Date;

  @Expose()
  details?: string;
}
