import { UserRoles } from '@/common/enum/user-roles.enum';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [100, 'Username must not exceed 100 characters'],
  })
  username: string;

  @Prop({ type: String, required: [true, 'Password is required'] })
  password: string; // hashed

  @Prop({
    type: String,
    enum: {
      values: Object.values(UserRoles),
      message: 'Invalid role',
    },
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
