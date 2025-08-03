import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true, index: true })
  phoneNumber: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop()
  email: string;

  @Prop()
  company: string;

  @Prop()
  jobTitle: string;

  @Prop()
  notes: string;

  @Prop({ type: [String], default: [] })
  tags: string[];

  @Prop()
  name: string;

  @Prop()
  pushName: string;

  @Prop()
  businessName: string;

  @Prop()
  verifiedName: string;

  @Prop({ default: false })
  isGroup: boolean;

  @Prop()
  profilePictureUrl: string;

  @Prop({ default: 0 })
  messagesSent: number;

  @Prop({ default: 0 })
  messagesReceived: number;

  @Prop()
  lastMessageAt: Date;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Additional contact metadata

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ContactSchema = SchemaFactory.createForClass(Contact);

// Create compound index for tenant-scoped phone number queries
ContactSchema.index({ tenantId: 1, phoneNumber: 1 });
