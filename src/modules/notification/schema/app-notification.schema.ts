import {
  NotificationTargetType,
  NotificationType,
} from '@/common/enum/notification-type.enum';
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

  @Prop({
    type: String,
    enum: NotificationTargetType,
    default: NotificationTargetType.INDIVIDUAL,
  })
  targetType: NotificationTargetType;

  @Prop({ type: [{ type: Types.ObjectId, refPath: 'targetType' }] })
  targetIds?: Types.ObjectId[];

  @Prop({ type: String })
  batchKey?: string;

  @Prop({
    type: String,
    enum: NotificationType,
    default: NotificationType.MESSAGE,
  })
  type: NotificationType;
}

export const AppNotificationSchema =
  SchemaFactory.createForClass(AppNotification);
