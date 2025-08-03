import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({
    type: Types.ObjectId,
    ref: 'WhatsAppSession',
    required: true,
    index: true,
  })
  deviceId: Types.ObjectId;

  @Prop({ required: true })
  phoneNumber: string; // Recipient phone number

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
    default: 'text',
  })
  messageType: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

  @Prop({ type: String, required: true })
  content: string;

  @Prop()
  caption?: string; // For media messages

  @Prop({
    type: Types.ObjectId,
    ref: 'ChatGroup',
    required: false,
  })
  groupId?: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    required: false,
  })
  replyToMessageId?: Types.ObjectId;

  @Prop({ type: [String], default: [] })
  mentionedPhoneNumbers: string[];

  @Prop({ default: false })
  broadcast: boolean;

  @Prop({
    type: String,
    enum: ['sent', 'delivered', 'read', 'failed', 'pending'],
    default: 'pending',
  })
  status: 'sent' | 'delivered' | 'read' | 'failed' | 'pending';

  @Prop()
  whatsappMessageId?: string; // WhatsApp message ID

  @Prop()
  errorMessage?: string; // Error message if failed

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({
    type: Types.ObjectId,
    ref: 'User',
    required: true,
  })
  sentBy: Types.ObjectId;

  @Prop({ type: Date, default: Date.now })
  sentAt: Date;

  @Prop()
  deliveredAt?: Date;

  @Prop()
  readAt?: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  // Legacy fields for backward compatibility
  @Prop({
    type: Types.ObjectId,
    ref: 'WhatsAppSession',
    required: false,
  })
  sessionId?: Types.ObjectId;

  @Prop({ required: false })
  to?: string; // Phone number or group ID

  @Prop({ required: false })
  from?: string; // Phone number

  @Prop({
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'document', 'location'],
    default: 'text',
  })
  type?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'location';

  @Prop()
  messageId?: string; // WhatsApp message ID

  @Prop()
  timestamp?: Date;

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Additional message metadata
}

export const MessageSchema = SchemaFactory.createForClass(Message);

// Create compound indexes for better query performance
MessageSchema.index({ tenantId: 1, createdAt: -1 });
MessageSchema.index({ deviceId: 1, createdAt: -1 });
MessageSchema.index({ sentBy: 1, createdAt: -1 });
MessageSchema.index({ phoneNumber: 1, createdAt: -1 });
