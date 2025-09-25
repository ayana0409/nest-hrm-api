import { IsNotEmpty, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from "class-validator";

export class CreatePositionDto {
    @IsString()
    @IsNotEmpty()
    @MinLength(2)
    @MaxLength(200)
    title: string;

    @IsString()
    @IsOptional()
    @MaxLength(100)
    level?: string;

    @IsNumber()
    @IsOptional()
    @Min(0)
    salary?: number;

    @IsString()
    @IsOptional()
    @MaxLength(1000)
    description?: string;
}
