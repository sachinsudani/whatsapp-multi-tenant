import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty({
    description: 'Group unique identifier',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'WhatsApp group ID',
    example: '120363025123456789',
  })
  groupId: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Project Team Alpha',
  })
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Team chat for Project Alpha development',
    required: false,
  })
  description?: string;

  @ApiProperty({
    description: 'Group invite code',
    example: 'ABC123',
    required: false,
  })
  inviteCode?: string;

  @ApiProperty({
    description: 'Group invite link',
    example: 'https://chat.whatsapp.com/ABC123',
    required: false,
  })
  inviteLink?: string;

  @ApiProperty({
    description: 'Whether this is an announcement group',
    example: false,
  })
  isAnnouncement: boolean;

  @ApiProperty({
    description: 'Whether this is a community group',
    example: false,
  })
  isCommunity: boolean;

  @ApiProperty({
    description: 'Array of participant phone numbers',
    example: ['+1234567890', '+0987654321'],
  })
  participants: string[];

  @ApiProperty({
    description: 'Number of participants in the group',
    example: 15,
  })
  participantCount: number;

  @ApiProperty({
    description: 'Group profile picture URL',
    example: 'https://example.com/group-pic.jpg',
    required: false,
  })
  profilePictureUrl?: string;

  @ApiProperty({
    description: 'Tenant ID that owns this group',
    example: '507f1f77bcf86cd799439012',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User who created this group',
    example: {
      id: '507f1f77bcf86cd799439013',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
  })
  createdBy: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };

  @ApiProperty({
    description: 'Group creation timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Group last update timestamp',
    example: '2024-01-15T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'Whether the group is deleted (soft delete)',
    example: false,
  })
  isDeleted: boolean;
}
