import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { WhatsAppSession } from '../database/schemas/whatsapp-session.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';

@Injectable()
export class WhatsAppService {
  private readonly wahaApiUrl: string;
  private readonly wahaApiKey: string;

  constructor(
    @InjectModel(WhatsAppSession.name)
    private whatsappSessionModel: Model<WhatsAppSession>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
    private configService: ConfigService,
  ) {
    this.wahaApiUrl =
      this.configService.get<string>('whatsapp.apiUrl') ||
      'http://localhost:3001';
    this.wahaApiKey = this.configService.get<string>('whatsapp.apiKey') || '';
  }

  async createDevice(
    createDeviceDto: CreateDeviceDto,
    tenantId: string,
  ): Promise<DeviceResponseDto> {
    // Create device in WAHA
    const deviceId = await this.createWahaDevice(createDeviceDto.name);

    // Save device to database
    const newDevice = new this.whatsappSessionModel({
      deviceId,
      deviceName: createDeviceDto.name,
      tenantId: new Types.ObjectId(tenantId),
      status: 'disconnected',
      isActive: createDeviceDto.isActive ?? true,
      isDeleted: false,
    });

    const savedDevice = await newDevice.save();

    return this.mapToDeviceResponse(savedDevice);
  }

  async findAllDevices(tenantId: string): Promise<DeviceResponseDto[]> {
    const devices = await this.whatsappSessionModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return devices.map((device) => this.mapToDeviceResponse(device));
  }

  async findDeviceById(
    deviceId: string,
    tenantId: string,
  ): Promise<DeviceResponseDto> {
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    return this.mapToDeviceResponse(device);
  }

  async updateDevice(
    deviceId: string,
    updateDeviceDto: UpdateDeviceDto,
    tenantId: string,
  ): Promise<DeviceResponseDto> {
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    const updatedDevice = await this.whatsappSessionModel
      .findByIdAndUpdate(deviceId, updateDeviceDto, {
        new: true,
        runValidators: true,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToDeviceResponse(updatedDevice);
  }

  async deleteDevice(
    deviceId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    // Disconnect device from WAHA if connected
    if (device.status === 'connected') {
      await this.disconnectWahaDevice(device.deviceId);
    }

    // Soft delete device
    await this.whatsappSessionModel
      .findByIdAndUpdate(deviceId, { isDeleted: true })
      .exec();

    return { message: 'Device deleted successfully' };
  }

  async generateQRCode(
    deviceId: string,
    tenantId: string,
  ): Promise<{ qrCode: string; expiresAt: Date }> {
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.status === 'connected') {
      throw new BadRequestException('Device is already connected');
    }

    try {
      // Generate QR code from WAHA
      const response = await fetch(`${this.wahaApiUrl}/api/sessions/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.wahaApiKey && {
            Authorization: `Bearer ${this.wahaApiKey}`,
          }),
        },
        body: JSON.stringify({
          name: device.deviceId,
          config: {
            webhooks: {
              all: `${this.configService.get<string>('app.url')}/api/whatsapp/webhook/${device.deviceId}`,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new HttpException(
          'Failed to generate QR code',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const qrData = await response.json();

      // Update device status
      await this.whatsappSessionModel
        .findByIdAndUpdate(deviceId, { status: 'connecting' })
        .exec();

      return {
        qrCode: qrData.qr,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      };
    } catch (error) {
      throw new HttpException(
        'Failed to generate QR code',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async sendMessage(
    sendMessageDto: SendMessageDto,
    tenantId: string,
    userId: string,
  ): Promise<MessageResponseDto> {
    // Validate device exists and belongs to tenant
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(sendMessageDto.deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    if (device.status !== 'connected') {
      throw new BadRequestException('Device is not connected');
    }

    if (!device.isActive) {
      throw new BadRequestException('Device is not active');
    }

    try {
      // Send message via WAHA
      const response = await fetch(
        `${this.wahaApiUrl}/api/sessions/${device.deviceId}/send`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.wahaApiKey && {
              Authorization: `Bearer ${this.wahaApiKey}`,
            }),
          },
          body: JSON.stringify({
            chatId: sendMessageDto.phoneNumber,
            content: sendMessageDto.content,
            ...(sendMessageDto.caption && { caption: sendMessageDto.caption }),
            ...(sendMessageDto.replyToMessageId && {
              replyTo: sendMessageDto.replyToMessageId,
            }),
            ...(sendMessageDto.mentionedPhoneNumbers && {
              mentioned: sendMessageDto.mentionedPhoneNumbers,
            }),
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new HttpException(
          errorData.message || 'Failed to send message',
          response.status,
        );
      }

      const messageData = await response.json();

      // Save message to database
      const newMessage = new this.messageModel({
        deviceId: new Types.ObjectId(sendMessageDto.deviceId),
        phoneNumber: sendMessageDto.phoneNumber,
        messageType: sendMessageDto.messageType,
        content: sendMessageDto.content,
        caption: sendMessageDto.caption,
        groupId: sendMessageDto.groupId
          ? new Types.ObjectId(sendMessageDto.groupId)
          : undefined,
        replyToMessageId: sendMessageDto.replyToMessageId
          ? new Types.ObjectId(sendMessageDto.replyToMessageId)
          : undefined,
        mentionedPhoneNumbers: sendMessageDto.mentionedPhoneNumbers,
        broadcast: sendMessageDto.broadcast ?? false,
        status: 'sent',
        whatsappMessageId: messageData.id,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: new Types.ObjectId(userId),
        sentAt: new Date(),
        isDeleted: false,
      });

      const savedMessage = await newMessage.save();

      // Update device message count
      await this.whatsappSessionModel
        .findByIdAndUpdate(sendMessageDto.deviceId, {
          $inc: { messagesSent: 1 },
          lastMessageAt: new Date(),
        })
        .exec();

      return this.mapToMessageResponse(savedMessage);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Failed to send message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getDeviceStatus(
    deviceId: string,
    tenantId: string,
  ): Promise<{ status: string; info?: any }> {
    const device = await this.whatsappSessionModel
      .findOne({
        _id: new Types.ObjectId(deviceId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!device) {
      throw new NotFoundException('Device not found');
    }

    try {
      // Get device status from WAHA
      const response = await fetch(
        `${this.wahaApiUrl}/api/sessions/${device.deviceId}`,
        {
          headers: {
            ...(this.wahaApiKey && {
              Authorization: `Bearer ${this.wahaApiKey}`,
            }),
          },
        },
      );

      if (!response.ok) {
        return { status: 'error' };
      }

      const statusData = await response.json();

      // Update device status in database
      await this.whatsappSessionModel
        .findByIdAndUpdate(deviceId, {
          status: statusData.state || 'disconnected',
          lastSeen:
            statusData.state === 'connected' ? new Date() : device.lastSeen,
        })
        .exec();

      return {
        status: statusData.state || 'disconnected',
        info: statusData,
      };
    } catch (error) {
      return { status: 'error' };
    }
  }

  private async createWahaDevice(name: string): Promise<string> {
    try {
      const response = await fetch(`${this.wahaApiUrl}/api/sessions/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.wahaApiKey && {
            Authorization: `Bearer ${this.wahaApiKey}`,
          }),
        },
        body: JSON.stringify({
          name,
          config: {
            webhooks: {
              all: `${this.configService.get<string>('app.url')}/api/whatsapp/webhook/${name}`,
            },
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create WAHA device');
      }

      const data = await response.json();
      return data.name || name;
    } catch (error) {
      throw new HttpException(
        'Failed to create device',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async disconnectWahaDevice(deviceId: string): Promise<void> {
    try {
      await fetch(`${this.wahaApiUrl}/api/sessions/${deviceId}/stop`, {
        method: 'POST',
        headers: {
          ...(this.wahaApiKey && {
            Authorization: `Bearer ${this.wahaApiKey}`,
          }),
        },
      });
    } catch (error) {
      // Log error but don't throw
      console.error('Failed to disconnect WAHA device:', error);
    }
  }

  private mapToDeviceResponse(device: any): DeviceResponseDto {
    return {
      id: device._id.toString(),
      name: device.deviceName,
      description: device.description,
      status: device.status,
      isActive: device.isActive,
      lastConnectedAt: device.lastSeen,
      lastMessageAt: device.lastMessageAt,
      messagesSent: device.messagesSent || 0,
      messagesReceived: device.messagesReceived || 0,
      tenantId: device.tenantId.toString(),
      createdBy: device.createdBy?._id?.toString() || '',
      createdAt: device.createdAt,
      updatedAt: device.updatedAt,
    };
  }

  private mapToMessageResponse(message: any): MessageResponseDto {
    return {
      id: message._id.toString(),
      deviceId: message.deviceId.toString(),
      phoneNumber: message.phoneNumber,
      messageType: message.messageType,
      content: message.content,
      caption: message.caption,
      groupId: message.groupId?.toString(),
      replyToMessageId: message.replyToMessageId?.toString(),
      mentionedPhoneNumbers: message.mentionedPhoneNumbers,
      broadcast: message.broadcast,
      status: message.status,
      whatsappMessageId: message.whatsappMessageId,
      errorMessage: message.errorMessage,
      tenantId: message.tenantId.toString(),
      sentBy: message.sentBy.toString(),
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
    };
  }
}
