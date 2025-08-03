import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsEnum,
} from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  LOCATION = 'location',
  CONTACT = 'contact',
}

export class SendMessageDto {
  @ApiProperty({
    description: 'Device ID to send message from',
    example: '507f1f77bcf86cd799439011',
  })
  @IsString({ message: 'Device ID must be a string' })
  @IsNotEmpty({ message: 'Device ID is required' })
  deviceId: string;

  @ApiProperty({
    description: 'Recipient phone number (with country code)',
    example: '+1234567890',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  phoneNumber: string;

  @ApiProperty({
    description: 'Message type',
    example: 'text',
    enum: MessageType,
  })
  @IsEnum(MessageType, { message: 'Invalid message type' })
  messageType: MessageType;

  @ApiProperty({
    description: 'Message content (text for text messages, URL for media)',
    example: 'Hello! This is a test message.',
  })
  @IsString({ message: 'Message content must be a string' })
  @IsNotEmpty({ message: 'Message content is required' })
  content: string;

  @ApiProperty({
    description: 'Message caption (for media messages)',
    example: 'Check out this image!',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Caption must be a string' })
  caption?: string;

  @ApiProperty({
    description: 'Group ID (if sending to a group)',
    example: '507f1f77bcf86cd799439012',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Group ID must be a string' })
  groupId?: string;

  @ApiProperty({
    description: 'Reply to message ID',
    example: '507f1f77bcf86cd799439013',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Reply to message ID must be a string' })
  replyToMessageId?: string;

  @ApiProperty({
    description: 'Mentioned phone numbers (for group messages)',
    example: ['+1234567890', '+0987654321'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Mentioned phone numbers must be an array' })
  @IsString({ each: true, message: 'Each phone number must be a string' })
  mentionedPhoneNumbers?: string[];

  @ApiProperty({
    description: 'Whether to send as broadcast message',
    example: false,
    default: false,
  })
  @IsOptional()
  broadcast?: boolean;
}
