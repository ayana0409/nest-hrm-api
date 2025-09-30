import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAppNotificationDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  message?: string;

  @IsOptional()
  read?: boolean;
}
