import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SalaryDocument = HydratedDocument<Salary>;

@Schema({ timestamps: true })
export class Salary {
    @Prop({ type: Types.ObjectId, ref: 'Employee', required: true, index: true })
    employeeId: Types.ObjectId;

    @Prop({ type: String, required: true, match: /^\d{4}-(0[1-9]|1[0-2])$/ })
    month: string; // YYYY-MM

    @Prop({ type: String })
    fullName: string;

    @Prop({ type: String })
    department: string;

    @Prop({ type: String })
    position: string;

    @Prop({ type: String })
    level: string;

    @Prop({ type: Number })
    workDates: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    offDates: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    oTHours: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    lateMinutes: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    absenceDays: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    baseSalary: number;

    @Prop({ type: Number, default: 0, min: 0 })
    bonus?: number;

    @Prop({ type: Number, default: 0, min: 0 })
    deductions?: number;

    @Prop({ type: Number, required: true, min: 0, default: 0 })
    netSalary: number;
}

export const SalarySchema = SchemaFactory.createForClass(Salary);