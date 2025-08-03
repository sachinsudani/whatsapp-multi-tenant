import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class BaseDocument extends Document {
  @Prop({ default: false })
  isDeleted: boolean;
}

export const BaseSchema = SchemaFactory.createForClass(BaseDocument);
