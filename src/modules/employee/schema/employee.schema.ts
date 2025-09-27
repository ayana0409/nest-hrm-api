import { NotFoundException } from '@nestjs/common';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Model, Types } from 'mongoose';

export type EmployeeDocument = HydratedDocument<Employee>;

@Schema({ timestamps: true })
export class Employee {
  @Prop({ type: String, required: true, trim: true, minlength: 2, maxlength: 200 })
  fullName: string;

  @Prop({
    type: String, required: true, unique: true, lowercase: true, trim: true,
    match: /^\S+@\S+\.\S+$/
  })
  email: string;

  @Prop({
    type: String, index: true, sparse: true, trim: true,
    match: /^\+?[0-9\- ]{7,20}$/
  })
  phone?: string;

  @Prop({ type: Date })
  dob?: Date;

  @Prop({ type: String, enum: ['male', 'female', 'other'], default: 'other' })
  gender?: string;

  @Prop({ type: String, maxlength: 500 })
  address?: string;

  @Prop({ type: Types.ObjectId, ref: 'Position', sparse: true })
  positionId?: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Department', sparse: true })
  departmentId?: Types.ObjectId;

  @Prop({ type: String, enum: ['active', 'inactive', 'terminated'], default: 'active' })
  status?: string;

  @Prop({ type: Date })
  startDate?: Date;

  @Prop({ type: Date })
  endDate?: Date;
}

export const EmployeeSchema = SchemaFactory.createForClass(Employee);

export interface EmployeeModel extends Model<EmployeeDocument> {
  checkExist(employeeId: string): Promise<EmployeeDocument>;
}

(EmployeeSchema.statics as Partial<EmployeeModel>).checkExist = async function (
  this: EmployeeModel,
  employeeId: string,
) {
  const employee = await this.findById(employeeId);
  if (!employee) {
    throw new NotFoundException('Employee not found', 'EMPLOYEE_NOT_FOUND');
  }
  return employee;
};

