import { Transform } from 'class-transformer';
import { IsMongoId, IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { Types } from 'mongoose';

export class CreateAppNotificationDto {
  @IsMongoId()
  @Transform(({ value }) => Types.ObjectId.createFromHexString(value))
  userId: Types.ObjectId;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
