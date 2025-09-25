import { Expose, Transform } from "class-transformer";

export class EmpDepartmentDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    _id: string;

    @Expose()
    name: string;
}