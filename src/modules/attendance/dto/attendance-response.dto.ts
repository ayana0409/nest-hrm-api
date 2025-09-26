import { Expose, Transform } from "class-transformer";

export class AttendanceResponseDto {
    @Expose()
    @Transform(({ obj }) => obj._id?.toString())
    id: string;

    @Expose()
    date: Date;

    @Expose()
    checkIn?: Date;

    @Expose()
    checkOut?: Date;

    @Expose()
    status?: string;

    @Expose()
    note?: string;

    @Expose()
    createdAt: Date;

    @Expose()
    updatedAt: Date;
}