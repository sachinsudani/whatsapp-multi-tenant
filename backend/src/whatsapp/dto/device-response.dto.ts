import { ApiProperty } from '@nestjs/swagger';

export class DeviceResponseDto {
  @ApiProperty({
    description: 'Device ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Device name',
    example: 'Office Phone',
  })
  name: string;

  @ApiProperty({
    description: 'Device description',
    example: 'Main office WhatsApp device',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Device status',
    example: 'connected',
    enum: ['disconnected', 'connecting', 'connected', 'error'],
  })
  status: string;

  @ApiProperty({
    description: 'Whether the device is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Last connection timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastConnectedAt?: Date;

  @ApiProperty({
    description: 'Last message timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastMessageAt?: Date;

  @ApiProperty({
    description: 'Total messages sent',
    example: 150,
  })
  messagesSent: number;

  @ApiProperty({
    description: 'Total messages received',
    example: 75,
  })
  messagesReceived: number;

  @ApiProperty({
    description: 'Tenant ID',
    example: '507f1f77bcf86cd799439012',
  })
  tenantId: string;

  @ApiProperty({
    description: 'Created by user ID',
    example: '507f1f77bcf86cd799439013',
  })
  createdBy: string;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2024-01-15T10:30:00.000Z',
  })
  updatedAt: Date;
}
