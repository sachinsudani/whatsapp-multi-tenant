import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({
    description: 'User ID',
    example: '507f1f77bcf86cd799439011',
  })
  id: string;

  @ApiProperty({
    description: 'User email address',
    example: 'john.doe@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'User first name',
    example: 'John',
  })
  firstName: string;

  @ApiProperty({
    description: 'User last name',
    example: 'Doe',
  })
  lastName: string;

  @ApiProperty({
    description: 'User phone number',
    example: '+1234567890',
    required: false,
  })
  phoneNumber?: string;

  @ApiProperty({
    description: 'Whether the user is active',
    example: true,
  })
  isActive: boolean;

  @ApiProperty({
    description: 'Whether the user email is verified',
    example: false,
  })
  isEmailVerified: boolean;

  @ApiProperty({
    description: 'Last login timestamp',
    example: '2024-01-15T10:30:00.000Z',
    required: false,
  })
  lastLoginAt?: Date;

  @ApiProperty({
    description: 'Tenant ID',
    example: '507f1f77bcf86cd799439012',
  })
  tenantId: string;

  @ApiProperty({
    description: 'User group ID',
    example: '507f1f77bcf86cd799439013',
  })
  userGroupId: string;

  @ApiProperty({
    description: 'User group information',
    example: {
      id: '507f1f77bcf86cd799439013',
      name: 'Admin',
      groupType: 'Admin',
    },
  })
  userGroup: {
    id: string;
    name: string;
    groupType: string;
  };

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
