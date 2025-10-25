import { DateHelper } from '@/common/helpers/dateHelper';
import { Expose, Transform } from 'class-transformer';

export default class EmpDays {
  @Expose()
  @Transform(({ obj }) => DateHelper.format(obj.month, 'yyyy-MM'))
  month: string; // YYYY-MM

  @Expose()
  workDates: number;

  @Expose()
  offDates: number;

  @Expose()
  absenceDays: number;
}
