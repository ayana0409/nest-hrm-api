import { Expose } from 'class-transformer';

export class NotificationResponseDto {
  @Expose()
  message: string;
}
