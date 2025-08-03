import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ChatGroupDocument = ChatGroup & Document;

@Schema({ timestamps: true })
export class ChatGroup {
  @Prop({ required: true, index: true })
  groupId: string; // WhatsApp group ID

  @Prop({ required: true })
  name: string;

  @Prop()
  description: string;

  @Prop()
  inviteCode: string;

  @Prop()
  inviteLink: string;

  @Prop({ default: false })
  isAnnouncement: boolean;

  @Prop({ default: false })
  isCommunity: boolean;

  @Prop({ type: [String] })
  participants: string[]; // Array of phone numbers

  @Prop()
  profilePictureUrl: string;

  @Prop({ type: Object })
  metadata: Record<string, any>; // Additional group metadata

  @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
  tenantId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const ChatGroupSchema = SchemaFactory.createForClass(ChatGroup);

// Create compound index for tenant-scoped group queries
ChatGroupSchema.index({ tenantId: 1, groupId: 1 });
