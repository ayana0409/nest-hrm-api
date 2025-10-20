import {
  IsEnum,
  IsMongoId,
  IsNumber,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { NotificationType } from '@/common/enum/notification-type.enum';

export class PagedNotificationRequestDto {
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  current?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  pageSize?: number = 10;

  @IsEnum(NotificationType)
  @IsOptional()
  targetType?: NotificationType;

  @IsMongoId()
  @IsOptional()
  targetId?: string;

  @IsMongoId()
  @IsOptional()
  userId?: string;

  @IsBoolean()
  @IsOptional()
  read?: boolean;
}
