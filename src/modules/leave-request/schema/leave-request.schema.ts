import { LeaveRequestStatus } from '@/common/enum/leave-request-status.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type LeaveRequestDocument = HydratedDocument<LeaveRequest>;

@Schema()
export class LeaveRequest {
    @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
    employeeId: Types.ObjectId;

    @Prop({ type: Date, required: true })
    startDate: Date;

    @Prop({ type: Date, required: true })
    endDate: Date;

    @Prop({ type: String, maxlength: 2000 })
    reason?: string;

    @Prop({ type: String, enum: LeaveRequestStatus, default: LeaveRequestStatus.Pending })
    status?: string;
}

export const LeaveRequestSchema = SchemaFactory.createForClass(LeaveRequest);
