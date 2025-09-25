import { Expose, Transform } from "class-transformer";

export class EmpPositionDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    _id: string;

    @Expose()
    title: string;

    @Expose()
    level?: string;

    @Expose()
    salary?: number;
}