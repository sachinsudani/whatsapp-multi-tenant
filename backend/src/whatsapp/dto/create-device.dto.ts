import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateDeviceDto {
  @ApiProperty({
    description: 'Device name for identification',
    example: 'Office Phone',
  })
  @IsString({ message: 'Device name must be a string' })
  @IsNotEmpty({ message: 'Device name is required' })
  name: string;

  @ApiProperty({
    description: 'Device description (optional)',
    example: 'Main office WhatsApp device',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Whether the device should be active immediately',
    example: true,
    default: true,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
