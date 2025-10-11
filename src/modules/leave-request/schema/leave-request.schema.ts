import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { formatDateToYMD } from '@/common/helpers/dateHelper';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Transform } from 'class-transformer';
import { HydratedDocument, Types } from 'mongoose';

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

@Schema()
export class LeaveRequest {
  @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
  employeeId: Types.ObjectId;

  @Prop({ type: Date, required: true })
  @Transform(({ obj }) => formatDateToYMD(obj.startDate.toString()))
  startDate: Date;

  @Prop({ type: Date, required: true })
  @Transform(({ obj }) => formatDateToYMD(obj.endDate.toString()))
  endDate: Date;

  @Prop({ type: String, maxlength: 2000 })
  reason?: string;

  @Prop({
    type: String,
    enum: LeaveRequestStatus,
    default: LeaveRequestStatus.Pending,
  })
  status?: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
