import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PositionDocument = HydratedDocument<Position>;

@Schema({ timestamps: true })
export class Position {
  @Prop({ type: String, required: true, trim: true, minlength: 2, maxlength: 200 })
  title: string;

  @Prop({ type: String, trim: true, maxlength: 100 })
  level?: string;

  @Prop({ type: Number, min: 0, default: 0 })
  salary?: number;

  @Prop({ type: String, maxlength: 1000 })
  description?: string;
}

export const PositionSchema = SchemaFactory.createForClass(Position);
