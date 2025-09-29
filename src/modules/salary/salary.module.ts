import { Module } from '@nestjs/common';
import { SalaryService } from './salary.service';
import { SalaryController } from './salary.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '../employee/schema/employee.schema';
import { Salary, SalarySchema } from './schema/salary.schema';
import { Attendance, AttendanceSchema } from '../attendance/schema/attendance.schema';
import { LeaveRequest, LeaveRequestSchema } from '../leave-request/schema/leave-request.schema';
import { AttendanceModule } from '../attendance/attendance.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Salary.name, schema: SalarySchema },
      { name: Employee.name, schema: EmployeeSchema },
      { name: Attendance.name, schema: AttendanceSchema },
      { name: LeaveRequest.name, schema: LeaveRequestSchema }
    ]),
    AttendanceModule
  ],
  controllers: [SalaryController],
  providers: [SalaryService],
})
export class SalaryModule { }
