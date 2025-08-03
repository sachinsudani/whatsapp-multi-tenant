import { ApiProperty } from '@nestjs/swagger';

export class ContactResponseDto {
  @ApiProperty({
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'Contact phone number',
    example: '+1234567890',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Contact first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'Contact last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'Contact full name',
    example: 'John Doe',
  })
  fullName: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'john.doe@example.com',
    required: false,
  })
  email?: string;

  @ApiProperty({
    description: 'Contact company',
    example: 'Acme Corp',
    required: false,
  })
  company?: string;

  @ApiProperty({
    description: 'Contact job title',
    example: 'Software Engineer',
    required: false,
  })
  jobTitle?: string;

  @ApiProperty({
    description: 'Contact notes',
    example: 'Important client for project X',
    required: false,
  })
  notes?: string;

  @ApiProperty({
    description: 'Contact tags for categorization',
    example: ['client', 'vip', 'project-a'],
  })
  tags: string[];

  @ApiProperty({
    description: 'Total messages sent to this contact',
    example: 25,
  })
  messagesSent: number;

  @ApiProperty({
    description: 'Total messages received from this contact',
    example: 15,
  })
  messagesReceived: number;

  @ApiProperty({
    description: 'Last message timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastMessageAt?: Date;

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
