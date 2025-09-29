import { Expose, Transform } from "class-transformer";

export class EmpSalaryDepartmentDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    _id: string;

    @Expose()
    name: string;
}