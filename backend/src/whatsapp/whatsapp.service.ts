import {
    Injectable,
    NotFoundException,
    BadRequestException,
    HttpException,
    HttpStatus,
    Logger,
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
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly useBaileys: boolean;

    constructor(
        @InjectModel(WhatsAppSession.name)
        private whatsappSessionModel: Model<WhatsAppSession>,
        @InjectModel(Message.name) private messageModel: Model<Message>,
        private configService: ConfigService,
    ) {
        this.useBaileys = this.configService.get<boolean>('whatsapp.useBaileys') || true;
    }

    async createDevice(
        createDeviceDto: CreateDeviceDto,
        tenantId: string,
    ): Promise<DeviceResponseDto> {
        try {
            this.logger.log(`Creating device: ${createDeviceDto.name} for tenant: ${tenantId}`);

            // Check if device name already exists for this tenant
            const existingDevice = await this.whatsappSessionModel.findOne({
                deviceName: createDeviceDto.name,
                tenantId: new Types.ObjectId(tenantId),
                isDeleted: false,
            });

            if (existingDevice) {
                throw new BadRequestException('Device name already exists for this tenant');
            }

            // Generate unique device ID
            const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Save device to database
            const newDevice = new this.whatsappSessionModel({
                deviceId,
                deviceName: createDeviceDto.name,
                description: createDeviceDto.description,
                tenantId: new Types.ObjectId(tenantId),
                status: 'disconnected',
                isActive: createDeviceDto.isActive ?? true,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const savedDevice = await newDevice.save();
            this.logger.log(`Device created successfully: ${savedDevice._id}`);

            return this.mapToDeviceResponse(savedDevice);
        } catch (error) {
            this.logger.error(`Failed to create device: ${error.message}`, error.stack);
            if (error instanceof BadRequestException) {
                throw error;
            }
            throw new HttpException(
                'Failed to create device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findAllDevices(tenantId: string): Promise<DeviceResponseDto[]> {
        try {
            const devices = await this.whatsappSessionModel
                .find({
                    tenantId: new Types.ObjectId(tenantId),
                    isDeleted: false,
                })
                .populate('createdBy', 'firstName lastName email')
                .sort({ createdAt: -1 })
                .exec();

            return devices.map((device) => this.mapToDeviceResponse(device));
        } catch (error) {
            this.logger.error(`Failed to fetch devices: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to fetch devices',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async findDeviceById(
        deviceId: string,
        tenantId: string,
    ): Promise<DeviceResponseDto> {
        try {
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
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to fetch device: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to fetch device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async updateDevice(
        deviceId: string,
        updateDeviceDto: UpdateDeviceDto,
        tenantId: string,
    ): Promise<DeviceResponseDto> {
        try {
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
                .findByIdAndUpdate(
                    deviceId,
                    {
                        ...updateDeviceDto,
                        updatedAt: new Date()
                    },
                    {
                        new: true,
                        runValidators: true,
                    }
                )
                .populate('createdBy', 'firstName lastName email')
                .exec();

            return this.mapToDeviceResponse(updatedDevice);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to update device: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to update device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async deleteDevice(
        deviceId: string,
        tenantId: string,
    ): Promise<{ message: string }> {
        try {
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

            // Soft delete device
            await this.whatsappSessionModel
                .findByIdAndUpdate(deviceId, {
                    isDeleted: true,
                    updatedAt: new Date()
                })
                .exec();

            return { message: 'Device deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to delete device: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to delete device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async generateQRCode(
        deviceId: string,
        tenantId: string,
    ): Promise<{ qrCode: string; expiresAt: Date }> {
        try {
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

            // Generate a mock QR code for demonstration
            const qrCode = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==`;

            // Update device status
            await this.whatsappSessionModel
                .findByIdAndUpdate(deviceId, {
                    status: 'connecting',
                    updatedAt: new Date()
                })
                .exec();

            return {
                qrCode,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
            };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to generate QR code: ${error.message}`, error.stack);
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
        try {
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

            // Simulate message sending
            const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

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
                whatsappMessageId: messageId,
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
                    updatedAt: new Date(),
                })
                .exec();

            return this.mapToMessageResponse(savedMessage);
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Failed to send message: ${error.message}`, error.stack);
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
        try {
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

            return {
                status: device.status,
                info: {
                    deviceId: device.deviceId,
                    deviceName: device.deviceName,
                    lastSeen: device.lastSeen,
                    messagesSent: device.messagesSent || 0,
                },
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            this.logger.error(`Failed to get device status: ${error.message}`, error.stack);
            return { status: 'error' };
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
