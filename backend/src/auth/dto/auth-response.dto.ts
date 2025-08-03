import { ApiProperty } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  accessToken: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  refreshToken: string;

  @ApiProperty({
    description: 'Token expiration time in seconds',
    example: 3600,
  })
  expiresIn: number;

  @ApiProperty({
    description: 'User information',
    example: {
      id: '507f1f77bcf86cd799439011',
      email: 'user@example.com',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: '507f1f77bcf86cd799439012',
      userGroupId: '507f1f77bcf86cd799439013',
    },
  })
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    tenantId: string;
    userGroupId: string;
  };
}
