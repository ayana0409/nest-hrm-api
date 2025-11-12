import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { NotificationTargetType } from '@/common/enum/notification-type.enum';

export class PagedNotificationRequestDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  current?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @IsEnum(NotificationTargetType)
  @IsOptional()
  targetType?: NotificationTargetType;

  @IsMongoId()
  @IsOptional()
  targetId?: string;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) =>
    value === 'true' ? true : value === 'false' ? false : undefined,
  )
  read?: boolean;
}
