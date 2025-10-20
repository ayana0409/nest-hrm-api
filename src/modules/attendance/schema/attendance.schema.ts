import { AttendanceStatus } from '@/common/enum/attendance-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AttendanceDocument = HydratedDocument<Attendance>;

@Schema({ timestamps: true })
export class Attendance {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  date: Date;

  @Prop({ type: Date })
  checkIn?: Date;

  @Prop({ type: Date })
  checkOut?: Date;

  @Prop({
    type: String,
    enum: Object.values(AttendanceStatus),
    default: AttendanceStatus.OnTime,
  })
  status?: string;

  @Prop({ type: String, maxlength: 1000 })
  note?: string;
}

export const AttendanceSchema = SchemaFactory.createForClass(Attendance);
