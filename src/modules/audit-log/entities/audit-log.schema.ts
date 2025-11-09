import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type AuditLogDocument = HydratedDocument<AuditLog>;

@Schema()
export class AuditLog {
  @Prop({ type: Types.ObjectId, ref: 'User', index: true })
  userId?: Types.ObjectId;

  @Prop({ required: true })
  action: string;

  @Prop({ required: true })
  module: string;

  @Prop({ required: true })
  entityId: string;

  @Prop({ type: Date })
  timestamp?: Date;

  @Prop({ type: String, maxlength: 1000 })
  details?: string;
}

export const AuditLogSchema = SchemaFactory.createForClass(AuditLog);
