import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type DepartmentDocument = HydratedDocument<Department>;

@Schema()
export class Department {
  @Prop({ type: String, required: true, unique: true, trim: true, minlength: 2, maxlength: 200 })
  name: string;

//   @Prop({ type: Types.ObjectId, ref: 'Employee', sparse: true })
//   managerId?: Types.ObjectId;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;
}

export const DepartmentSchema = SchemaFactory.createForClass(Department);

