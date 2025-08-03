import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class UpdateDeviceDto {
  @ApiProperty({
    description: 'Device name for identification',
    example: 'Office Phone',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Device name must be a string' })
  @IsNotEmpty({ message: 'Device name cannot be empty' })
  name?: string;

  @ApiProperty({
    description: 'Device description',
    example: 'Main office WhatsApp device',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    description: 'Whether the device is active',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isActive must be a boolean' })
  isActive?: boolean;
}
