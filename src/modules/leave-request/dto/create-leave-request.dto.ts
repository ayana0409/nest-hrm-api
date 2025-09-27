import { LeaveRequestStatus } from "@/common/enum/leave-request-status.enum";
import { IsMongoId, IsNotEmpty, IsDateString, IsString, IsOptional, MaxLength } from "class-validator";

export class CreateLeaveRequestDto {
    @IsMongoId()
    @IsNotEmpty()
    employeeId: string;

    @IsDateString()
    @IsNotEmpty()
    startDate: string;

    @IsDateString()
    @IsNotEmpty()
    endDate: string;

    @IsString()
    @IsOptional()
    @MaxLength(2000)
    reason?: string;

    @IsString()
    @IsOptional()
    status?: LeaveRequestStatus;
}
