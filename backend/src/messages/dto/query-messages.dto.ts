import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MessageType } from '../../whatsapp/dto/send-message.dto';

export class QueryMessagesDto {
  @ApiProperty({
    description: 'Page number for pagination',
    example: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Page must be a number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber({}, { message: 'Limit must be a number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot exceed 100' })
  limit?: number = 10;

  @ApiProperty({
    description: 'Device ID to filter messages',
    example: '507f1f77bcf86cd799439011',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Device ID must be a string' })
  deviceId?: string;

  @ApiProperty({
    description: 'Phone number to filter messages',
    example: '+1234567890',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Phone number must be a string' })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Message type to filter',
    example: 'text',
    enum: MessageType,
    required: false,
  })
  @IsOptional()
  @IsEnum(MessageType, { message: 'Invalid message type' })
  messageType?: MessageType;

  @ApiProperty({
    description: 'Message status to filter',
    example: 'sent',
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Status must be a string' })
  status?: string;

  @ApiProperty({
    description: 'Filter by broadcast messages',
    example: false,
    required: false,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({ message: 'Broadcast must be a boolean' })
  broadcast?: boolean;

  @ApiProperty({
    description: 'Start date for filtering (ISO string)',
    example: '2024-01-01T00:00:00.000Z',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Start date must be a string' })
  startDate?: string;

  @ApiProperty({
    description: 'End date for filtering (ISO string)',
    example: '2024-01-31T23:59:59.999Z',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'End date must be a string' })
  endDate?: string;

  @ApiProperty({
    description: 'Sort field',
    example: 'sentAt',
    enum: ['sentAt', 'deliveredAt', 'readAt', 'phoneNumber', 'status'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort field must be a string' })
  sortBy?: string = 'sentAt';

  @ApiProperty({
    description: 'Sort order',
    example: 'desc',
    enum: ['asc', 'desc'],
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Sort order must be a string' })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
