import { Injectable } from '@nestjs/common';
import { AttendanceService } from '../attendance/attendance.service';
import { EmployeeService } from '../employee/employee.service';
import { EmployeeStatusEnum } from '@/common/enum/employee-status..enum';
import { LeaveRequestService } from '../leave-request/leave-request.service';
import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';

@Injectable()
export class DashboardService {
  constructor(
    private readonly attendanceService: AttendanceService,
    private readonly employeeService: EmployeeService,
    private readonly leaveRequestService: LeaveRequestService,
  ) {}

  async getDashboardChart() {
    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);

    const { checkOut, halfDay, onboard } =
      await this.attendanceService.caculateOnboard(startOfDay, endOfDay);

    const totalActiveEmp = await this.employeeService.countEmp(
      EmployeeStatusEnum.Active,
    );

    const offEmp = await this.leaveRequestService.countRequest(
      new Date(),
      LeaveRequestStatus.Approved,
    );

    return { total: totalActiveEmp, checkOut, halfDay, onboard, offEmp };
  }
}
