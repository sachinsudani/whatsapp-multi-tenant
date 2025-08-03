import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WhatsAppService } from './whatsapp.service';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@ApiTags('WhatsApp')
@Controller('whatsapp')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Post('devices')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new WhatsApp device' })
  @ApiResponse({
    status: 201,
    description: 'Device created successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async createDevice(
    @Body() createDeviceDto: CreateDeviceDto,
    @Request() req: Request & { user: any },
  ): Promise<DeviceResponseDto> {
    return this.whatsappService.createDevice(
      createDeviceDto,
      req.user.tenantId,
    );
  }

  @Get('devices')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all WhatsApp devices for the tenant' })
  @ApiResponse({
    status: 200,
    description: 'Devices retrieved successfully',
    type: [DeviceResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  async findAllDevices(
    @Request() req: Request & { user: any },
  ): Promise<DeviceResponseDto[]> {
    return this.whatsappService.findAllDevices(req.user.tenantId);
  }

  @Get('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get WhatsApp device by ID' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device retrieved successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async findDeviceById(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<DeviceResponseDto> {
    return this.whatsappService.findDeviceById(id, req.user.tenantId);
  }

  @Put('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update WhatsApp device by ID' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device updated successfully',
    type: DeviceResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async updateDevice(
    @Param('id') id: string,
    @Body() updateDeviceDto: UpdateDeviceDto,
    @Request() req: Request & { user: any },
  ): Promise<DeviceResponseDto> {
    return this.whatsappService.updateDevice(
      id,
      updateDeviceDto,
      req.user.tenantId,
    );
  }

  @Delete('devices/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete WhatsApp device by ID' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async deleteDevice(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<{ message: string }> {
    return this.whatsappService.deleteDevice(id, req.user.tenantId);
  }

  @Post('devices/:id/qr')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Generate QR code for device authentication' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'QR code generated successfully',
    schema: {
      type: 'object',
      properties: {
        qrCode: { type: 'string' },
        expiresAt: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - device already connected',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async generateQRCode(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<{ qrCode: string; expiresAt: Date }> {
    return this.whatsappService.generateQRCode(id, req.user.tenantId);
  }

  @Get('devices/:id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get device connection status' })
  @ApiParam({ name: 'id', description: 'Device ID' })
  @ApiResponse({
    status: 200,
    description: 'Device status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string' },
        info: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async getDeviceStatus(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<{ status: string; info?: any }> {
    return this.whatsappService.getDeviceStatus(id, req.user.tenantId);
  }

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send WhatsApp message' })
  @ApiResponse({
    status: 200,
    description: 'Message sent successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - device not connected or validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Device not found',
  })
  async sendMessage(
    @Body() sendMessageDto: SendMessageDto,
    @Request() req: Request & { user: any },
  ): Promise<MessageResponseDto> {
    return this.whatsappService.sendMessage(
      sendMessageDto,
      req.user.tenantId,
      req.user.id,
    );
  }
}
