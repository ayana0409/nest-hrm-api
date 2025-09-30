import { IsObjectId } from '@/common/helpers/validateHelper';
import { isNotEmpty, IsNotEmpty, IsOptional } from 'class-validator';
import { Types } from 'mongoose';

export class CreateUserDto {
  @IsNotEmpty()
  username: string;

  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsObjectId()
  employeeId: Types.ObjectId;

  @IsOptional()
  role: string = 'employee';
}
