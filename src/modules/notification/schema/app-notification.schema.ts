import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AppNotificationDocument = HydratedDocument<AppNotification>;

@Schema({ timestamps: true })
export class AppNotification {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ type: String, required: true, maxlength: 2000 })
  message: string;

  @Prop({ type: Boolean, default: false })
  read?: boolean;
}

export const AppNotificationSchema =
  SchemaFactory.createForClass(AppNotification);
