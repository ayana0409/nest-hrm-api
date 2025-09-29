import { Expose, Transform } from "class-transformer";
import { EmpSalaryDepartmentDto } from "./emp-salary-department.dto";
import { EmpSalaryPositionDto } from "./emp-salary-position.dto";

export class EmployeeSalaryDto {
    @Expose()
    employeeId: number;

    @Expose()
    fullName: string;

    @Expose()
    @Transform(({ obj }) =>
        obj.departmentId ? { id: obj.departmentId._id?.toString(), name: obj.departmentId.name } : null
    )
    department?: EmpSalaryDepartmentDto;

    @Expose()
    @Transform(({ obj }) =>
        obj.positionId ? {
            id: obj.positionId._id?.toString(),
            title: obj.positionId.title,
            level: obj.positionId.level,
            salary: obj.positionId.salary
        } : null
    )
    position?: EmpSalaryPositionDto;

    baseSalary: number;

    bonus?: number;

    deductions?: number;

    netSalary: number;
}