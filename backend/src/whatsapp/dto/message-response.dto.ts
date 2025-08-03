import { ApiProperty } from '@nestjs/swagger';
import { MessageType } from './send-message.dto';

export class MessageResponseDto {
  @ApiProperty({
    description: 'Message ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Device ID that sent the message',
    example: '507f1f77bcf86cd799439012',
  })
  deviceId: string;

  @ApiProperty({
    description: 'Recipient phone number',
    example: '+1234567890',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Message type',
    example: 'text',
    enum: MessageType,
  })
  messageType: MessageType;

  @ApiProperty({
    description: 'Message content',
    example: 'Hello! This is a test message.',
  })
  content: string;

  @ApiProperty({
    description: 'Message caption (for media messages)',
    example: 'Check out this image!',
    required: false,
  })
  caption?: string;

  @ApiProperty({
    description: 'Group ID (if sent to a group)',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  groupId?: string;

  @ApiProperty({
    description: 'Reply to message ID',
    example: '507f1f77bcf86cd799439014',
    required: false,
  })
  replyToMessageId?: string;

  @ApiProperty({
    description: 'Mentioned phone numbers',
    example: ['+1234567890', '+0987654321'],
    required: false,
  })
  mentionedPhoneNumbers?: string[];

  @ApiProperty({
    description: 'Whether it was sent as broadcast',
    example: false,
  })
  broadcast: boolean;

  @ApiProperty({
    description: 'Message status',
    example: 'sent',
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
  })
  status: string;

  @ApiProperty({
    description: 'WhatsApp message ID',
    example: '3EB0C767D92B0A78',
    required: false,
  })
  whatsappMessageId?: string;

  @ApiProperty({
    description: 'Error message (if failed)',
    example: 'Phone number not found',
    required: false,
  })
  errorMessage?: string;

  @ApiProperty({
    description: 'Tenant ID',
    example: '507f1f77bcf86cd799439015',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Sent by user ID',
    example: '507f1f77bcf86cd799439016',
  })
  sentBy: string;

  @ApiProperty({
    description: 'Sent timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  sentAt: Date;

  @ApiProperty({
    description: 'Delivered timestamp',
    example: '2024-01-15T10:31:00.000Z',
    required: false,
  })
  deliveredAt?: Date;

  @ApiProperty({
    description: 'Read timestamp',
    example: '2024-01-15T10:32:00.000Z',
    required: false,
  })
  readAt?: Date;
}
