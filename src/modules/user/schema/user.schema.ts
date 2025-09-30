import { UserRoles } from '@/common/enum/user-roles.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 100,
  })
  username: string;

  @Prop({ type: String, required: true })
  password: string; // hashed

  @Prop({
    type: String,
    enum: UserRoles,
    default: UserRoles.EMPLOYEE,
  })
  role: string;

  @Prop({ type: Types.ObjectId, ref: 'Employee', sparse: true })
  employeeId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  refreshTokens: string[];

  @Prop({ type: Boolean, default: true })
  active?: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
