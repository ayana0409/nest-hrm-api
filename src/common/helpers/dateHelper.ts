import { toZonedTime, format } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

const TIME_ZONE = 'Asia/Ho_Chi_Minh';

export class DateHelper {
    /** Lấy thời gian hiện tại theo GMT+7 */
    static now(): Date {
        return toZonedTime(new Date(), TIME_ZONE);
    }

    /** Chuyển một Date về múi giờ GMT+7 */
    static toZoned(date: Date): Date {
        return toZonedTime(date, TIME_ZONE);
    }

    /** Format Date theo chuỗi yyyy-MM-dd HH:mm:ss theo GMT+7 */
    static format(date: Date, fmt = 'yyyy-MM-dd HH:mm:ss'): string {
        return format(toZonedTime(date, TIME_ZONE), fmt, { timeZone: TIME_ZONE });
    }

    /** Lấy ngày hiện tại yyyy-MM-dd theo GMT+7 */
    static today(): string {
        return this.format(this.now(), 'yyyy-MM-dd');
    }

    /** Lấy start và end của ngày hiện tại theo GMT+7 */
    static getTodayRange(): { start: Date; end: Date } {
        const now = this.now();
        const start = toZonedTime(startOfDay(now), TIME_ZONE);
        const end = toZonedTime(endOfDay(now), TIME_ZONE);
        return { start, end };
    }
}
