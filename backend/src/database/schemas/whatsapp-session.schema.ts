import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type WhatsAppSessionDocument = WhatsAppSession & Document;

@Schema({ timestamps: true })
export class WhatsAppSession {
    @Prop({ required: true, index: true })
    deviceId: string;

    @Prop({ type: String })
    sessionData: string; // JSON string containing session information

    @Prop({ default: false })
    isActive: boolean;

    @Prop()
    phoneNumber: string;

    @Prop()
    deviceName: string;

    @Prop()
    description: string;

    @Prop()
    lastSeen: Date;

    @Prop()
    lastMessageAt: Date;

    @Prop({ default: 0 })
    messagesSent: number;

    @Prop({ default: 0 })
    messagesReceived: number;

    @Prop()
    qrCode: string; // Temporary QR code for authentication

    @Prop()
    qrCodeExpiresAt: Date;

    @Prop({
        type: String,
        enum: ['connected', 'disconnected', 'connecting', 'error'],
        default: 'disconnected',
    })
    status: 'connected' | 'disconnected' | 'connecting' | 'error';

    @Prop()
    errorMessage: string;

    @Prop({ type: Types.ObjectId, ref: 'Tenant', required: true, index: true })
    tenantId: Types.ObjectId;

    @Prop({ type: Types.ObjectId, ref: 'User' })
    createdBy: Types.ObjectId;

    @Prop({ default: false })
    isDeleted: boolean;
}

export const WhatsAppSessionSchema =
    SchemaFactory.createForClass(WhatsAppSession);
