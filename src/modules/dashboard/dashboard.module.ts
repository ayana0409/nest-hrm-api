import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { AttendanceModule } from '../attendance/attendance.module';
import { EmployeeModule } from '../employee/employee.module';
import { LeaveRequestModule } from '../leave-request/leave-request.module';

@Module({
  imports: [AttendanceModule, EmployeeModule, LeaveRequestModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
