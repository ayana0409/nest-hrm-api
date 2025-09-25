import { IsObjectId } from '@/common/helpers/validateHelper';
import { IsObjectIdPipe } from '@nestjs/mongoose';
import { Type } from 'class-transformer';
import {
    IsNotEmpty,
    IsString,
    MinLength,
    MaxLength,
    IsEmail,
    IsOptional,
    Matches,
    IsDate,
    IsEnum,
} from 'class-validator';

export class CreateEmployeeDto {
    @IsNotEmpty()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    fullName: string;

    @IsNotEmpty()
    @IsEmail()
    email: string;

    @IsOptional()
    @Matches(/^\+?[0-9\- ]{7,20}$/)
    phone?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    dob?: Date;

    @IsOptional()
    @IsEnum(['male', 'female', 'other'])
    gender?: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @IsObjectId()
    positionId?: string;

    @IsObjectId()
    departmentId?: string;

    @IsOptional()
    @IsEnum(['active', 'inactive', 'terminated'])
    status?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;
}
