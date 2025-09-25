import { IsString, IsNotEmpty, MinLength, MaxLength, IsOptional } from "class-validator";

export class CreateDepartmentDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    name: string;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;
}
