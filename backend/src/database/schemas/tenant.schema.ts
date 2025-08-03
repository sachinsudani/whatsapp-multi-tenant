import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TenantDocument = Tenant & Document;

@Schema({ timestamps: true })
export class Tenant {
  @Prop({ required: true, unique: true, index: true })
  name: string;

  @Prop()
  description: string;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Object })
  settings: Record<string, any>;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const TenantSchema = SchemaFactory.createForClass(Tenant);
