import { AttendanceStatus } from "@/common/enum/attendance-status.enum";
import { Type } from "class-transformer";
import { IsDate, IsDateString, IsEnum, IsMongoId, IsOptional, MaxLength } from "class-validator";

export class CreateAttendanceDto {
    @IsMongoId()
    employeeId: string

    @IsOptional()
    @IsDateString()
    date?: string = new Date().toISOString();

    @IsOptional()
    @IsDateString()
    checkIn?: string = new Date().toISOString();

    @IsOptional()
    @IsDateString()
    checkOut?: string;

    @IsOptional()
    @IsEnum(AttendanceStatus)
    status?: AttendanceStatus;

    @IsOptional()
    @MaxLength(1000)
    note?: string;
}
