import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsBoolean,
  IsUrl,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'WhatsApp group ID',
    example: '120363025123456789',
  })
  @IsString({ message: 'Group ID must be a string' })
  @IsNotEmpty({ message: 'Group ID is required' })
  groupId: string;

  @ApiProperty({
    description: 'Group name',
    example: 'Project Team Alpha',
  })
  @IsString({ message: 'Group name must be a string' })
  @IsNotEmpty({ message: 'Group name is required' })
  name: string;

  @ApiProperty({
    description: 'Group description',
    example: 'Team chat for Project Alpha development',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Group invite code',
    example: 'ABC123',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Invite code must be a string' })
  inviteCode?: string;

  @ApiProperty({
    description: 'Group invite link',
    example: 'https://chat.whatsapp.com/ABC123',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid URL' })
  inviteLink?: string;

  @ApiProperty({
    description: 'Whether this is an announcement group',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isAnnouncement must be a boolean' })
  isAnnouncement?: boolean;

  @ApiProperty({
    description: 'Whether this is a community group',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isCommunity must be a boolean' })
  isCommunity?: boolean;

  @ApiProperty({
    description: 'Array of participant phone numbers',
    example: ['+1234567890', '+0987654321'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Participants must be an array' })
  @IsString({ each: true, message: 'Each participant must be a string' })
  participants?: string[];

  @ApiProperty({
    description: 'Group profile picture URL',
    example: 'https://example.com/group-pic.jpg',
    required: false,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Please provide a valid URL' })
  profilePictureUrl?: string;
}
