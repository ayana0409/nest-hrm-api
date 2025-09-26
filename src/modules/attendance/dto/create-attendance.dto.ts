import { IsDateString, IsEnum, IsMongoId, IsOptional, MaxLength } from "class-validator";

export class CreateAttendanceDto {
    @IsMongoId()
    employeeId: string;

    @IsDateString()
    date: string;

    @IsOptional()
    @IsDateString()
    checkIn?: string;

    @IsOptional()
    @IsDateString()
    checkOut?: string;

    @IsOptional()
    @IsEnum(['on_time', 'late', 'absent', 'half_day'])
    status?: string;

    @IsOptional()
    @MaxLength(1000)
    note?: string;
}
