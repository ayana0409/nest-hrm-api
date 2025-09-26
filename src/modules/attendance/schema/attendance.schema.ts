import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttendanceDocument = HydratedDocument<Attendance>;

export class Attendance {
    @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
    employeeId: Types.ObjectId;

    @Prop({ type: Date, required: true })
    date: Date;

    @Prop({ type: Date })
    checkIn?: Date;

    @Prop({ type: Date })
    checkOut?: Date;

    @Prop({ type: String, enum: ['on_time', 'late', 'absent', 'half_day'], default: 'on_time' })
    status?: string;

    @Prop({ type: String, maxlength: 1000 })
    note?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);

