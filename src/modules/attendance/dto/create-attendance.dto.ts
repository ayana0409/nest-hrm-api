import { AttendanceStatus } from "@/common/enum/attendance-status.enum";
import { IsDate, IsDateString, IsEnum, IsMongoId, IsOptional, MaxLength } from "class-validator";
import { Types } from "mongoose";

export class CreateAttendanceDto {
    @IsMongoId()
    employeeId: Types.ObjectId

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
