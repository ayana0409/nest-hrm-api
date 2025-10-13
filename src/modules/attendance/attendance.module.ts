import { Module } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AttendanceController } from './attendance.controller';
import { Attendance, AttendanceSchema } from './schema/attendance.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { Employee, EmployeeSchema } from '../employee/schema/employee.schema';
import { EmpFaceService } from '@/services/face/emp-face.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Attendance.name, schema: AttendanceSchema },
      { name: Employee.name, schema: EmployeeSchema },
    ]),
  ],
  controllers: [AttendanceController],
  providers: [AttendanceService, EmpFaceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
