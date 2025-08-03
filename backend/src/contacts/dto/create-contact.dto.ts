import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  Matches,
} from 'class-validator';

export class CreateContactDto {
  @ApiProperty({
    description: 'Contact phone number (with country code)',
    example: '+1234567890',
  })
  @IsString({ message: 'Phone number must be a string' })
  @IsNotEmpty({ message: 'Phone number is required' })
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Please provide a valid phone number',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'Contact first name',
    example: 'John',
  })
  @IsString({ message: 'First name must be a string' })
  @IsNotEmpty({ message: 'First name is required' })
  firstName: string;

  @ApiProperty({
    description: 'Contact last name',
    example: 'Doe',
  })
  @IsString({ message: 'Last name must be a string' })
  @IsNotEmpty({ message: 'Last name is required' })
  lastName: string;

  @ApiProperty({
    description: 'Contact email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Email must be a string' })
  email?: string;

  @ApiProperty({
    description: 'Contact company',
    example: 'Acme Corp',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Company must be a string' })
  company?: string;

  @ApiProperty({
    description: 'Contact job title',
    example: 'Software Engineer',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Job title must be a string' })
  jobTitle?: string;

  @ApiProperty({
    description: 'Contact notes',
    example: 'Important client for project X',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Notes must be a string' })
  notes?: string;

  @ApiProperty({
    description: 'Contact tags for categorization',
    example: ['client', 'vip', 'project-a'],
    required: false,
  })
  @IsOptional()
  @IsArray({ message: 'Tags must be an array' })
  @IsString({ each: true, message: 'Each tag must be a string' })
  tags?: string[];
}
