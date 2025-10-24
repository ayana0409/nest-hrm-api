import { DateHelper, formatDateToYMD } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';

export default class SalaryResponse {
  @Expose()
  _id: string;

  @Expose()
  employeeId: string;

  @Expose()
  @Transform(({ obj }) => DateHelper.format(obj.month, 'yyyy-MM'))
  month: string; // YYYY-MM

  @Expose()
  fullName: string;

  @Expose()
  department: string;

  @Expose()
  position: string;

  @Expose()
  level: string;
  @Expose()
  workDates: number;

  @Expose()
  offDates: number;

  @Expose()
  oTHours: number;

  @Expose()
  lateMinutes: number;

  @Expose()
  absenceDays: number;

  @Expose()
  baseSalary: number;

  @Expose()
  bonus?: number;

  @Expose()
  deductions?: number;

  @Expose()
  netSalary: number;
}
