export class EmpAttendanceDto {
    constructor(partial: Partial<EmpAttendanceDto>) {
        Object.assign(this, partial);
    }
    employeeId: string;
    fullDay: number;
    halfDay: number;
    absentDay: number;
    totalDay: number;
}