import { IsObjectId } from "@/common/helpers/validateHelper";
import { isNotEmpty, IsNotEmpty, IsOptional } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    username: string;

    @IsNotEmpty()
    password: string;

    @IsOptional()
    @IsObjectId()
    employeeId: string;

    @IsOptional()
    role: string = 'employee';
}
