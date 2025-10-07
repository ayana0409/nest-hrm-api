import { Schema, Prop, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type RefreshTokenDocument = HydratedDocument<RefreshToken>;

@Schema({ timestamps: true })
export class RefreshToken {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  refreshToken: string; // bcrypt hash of raw token

  @Prop({ default: false })
  used: boolean;
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken);
