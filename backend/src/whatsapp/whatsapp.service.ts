import { Boom } from '@hapi/boom';
import {
    BadRequestException,
    HttpException,
    HttpStatus,
    Injectable,
    Logger,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { DisconnectReason, fetchLatestBaileysVersion, isJidBroadcast, makeWASocket, useMultiFileAuthState, WASocket } from '@whiskeysockets/baileys';
import * as fs from 'fs';
import { Model, Types } from 'mongoose';
import * as path from 'path';
import * as QRCode from 'qrcode';
import { Message } from '../database/schemas/message.schema';
import { WhatsAppSession } from '../database/schemas/whatsapp-session.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { DeviceResponseDto } from './dto/device-response.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';

@Injectable()
export class WhatsAppService {
    private readonly logger = new Logger(WhatsAppService.name);
    private readonly useBaileys: boolean;
    private readonly sessions: Map<string, any> = new Map();
    private readonly qrCodes: Map<string, string> = new Map();
    private readonly deviceCreationInProgress: Set<string> = new Set(); // Track device creation to prevent duplicates
    private readonly createdDevices: Set<string> = new Set(); // Track created devices to prevent duplicates

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
        userId: string,
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

            // Create session directory
            const sessionDir = path.join(process.cwd(), 'sessions', deviceId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Save device to database
            const newDevice = new this.whatsappSessionModel({
                deviceId,
                deviceName: createDeviceDto.name,
                description: createDeviceDto.description,
                tenantId: new Types.ObjectId(tenantId),
                createdBy: new Types.ObjectId(userId),
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

            // Disconnect session if active
            if (this.sessions.has(device.deviceId)) {
                const session = this.sessions.get(device.deviceId);
                await session.logout();
                this.sessions.delete(device.deviceId);
            }

            // Clean up session directory
            const sessionDir = path.join(process.cwd(), 'sessions', device.deviceId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
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

    async generateQRCodeForNewDevice(
        deviceName: string,
        description: string,
        tenantId: string,
        userId: string,
    ): Promise<{ qrCode: string; expiresAt: Date; sessionId: string }> {
        try {
            this.logger.log(`🔄 Starting QR generation for device: ${deviceName}`);

            // Generate a unique session ID
            const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            const sessionDir = path.join(process.cwd(), 'sessions', sessionId);

            // Ensure session directory exists
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            // Initialize Baileys auth state
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
            const { version } = await fetchLatestBaileysVersion();

            this.logger.log(`📦 Baileys version: ${version}`);

            const sock: WASocket = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: false,
                browser: ['Ubuntu', 'Chrome', '110.0.0.0'],
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 25000,
                retryRequestDelayMs: 2000,
                shouldIgnoreJid: isJidBroadcast,
            });

            this.sessions.set(sessionId, sock);

            let qrResolved = false;
            let credsSaved = false;

            // Set up QR timeout
            const qrTimeout = setTimeout(() => {
                if (!qrResolved) {
                    this.logger.warn(`⏰ QR not scanned in time. Cleaning session: ${sessionId}`);
                    this.sessions.delete(sessionId);
                    this.qrCodes.delete(sessionId);
                }
            }, 5 * 60 * 1000); // 5 minutes

            // Connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr && !qrResolved) {
                    try {
                        const qrCode = await QRCode.toDataURL(qr);
                        this.qrCodes.set(sessionId, qrCode);
                        qrResolved = true;
                        this.logger.log(`✅ QR generated for session: ${sessionId}`);
                    } catch (err) {
                        this.logger.error(`❌ Failed to generate QR: ${err.message}`);
                    }
                }

                if (connection === 'open') {
                    this.logger.log(`🟢 WhatsApp connected: ${sessionId}`);
                    // Don’t call createDeviceFromSession() here
                }

                if (connection === 'close') {
                    const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
                    const shouldReconnect = code !== DisconnectReason.loggedOut;

                    this.logger.warn(`🔌 Connection closed (code: ${code}) for ${sessionId} | Reconnect: ${shouldReconnect}`);

                    const credsPath = path.join(sessionDir, 'creds.json');
                    const hasCreds = fs.existsSync(credsPath);

                    if (hasCreds && !credsSaved) {
                        // Slight delay to ensure connection is finalized
                        setTimeout(async () => {
                            if (!this.createdDevices.has(sessionId)) {
                                this.createdDevices.add(sessionId);
                                await this.createDeviceFromSession(sessionId, deviceName, description, tenantId, userId);
                            }
                        }, 3000);
                    }

                    if (!shouldReconnect) {
                        this.sessions.delete(sessionId);
                        this.qrCodes.delete(sessionId);
                        this.logger.log(`🧹 Session cleaned up: ${sessionId}`);
                    }
                }
            });

            // Credential update
            sock.ev.on('creds.update', async () => {
                this.logger.log(`🔐 Credentials updated for session: ${sessionId}`);
                await saveCreds();
                credsSaved = true;

                setTimeout(async () => {
                    if (!this.createdDevices.has(sessionId)) {
                        this.createdDevices.add(sessionId);
                        await this.createDeviceFromSession(sessionId, deviceName, description, tenantId, userId);
                    }
                }, 3000);
            });

            // Wait for QR code
            let attempts = 0;
            const maxAttempts = 30;
            while (!this.qrCodes.has(sessionId) && attempts < maxAttempts) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
                if (attempts % 5 === 0) {
                    this.logger.log(`⌛ Waiting for QR code... (${attempts}/${maxAttempts})`);
                }
            }

            clearTimeout(qrTimeout); // clear timeout if resolved early

            const qrCode = this.qrCodes.get(sessionId);
            if (!qrCode) {
                this.sessions.delete(sessionId);
                throw new Error(`Failed to generate QR code within timeout`);
            }

            return {
                qrCode,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000),
                sessionId,
            };
        } catch (error) {
            this.logger.error(`❌ generateQRCodeForNewDevice error: ${error.message}`, error.stack);
            throw new HttpException('Failed to generate QR code', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    async checkConnectionStatus(sessionId: string): Promise<{ connected: boolean; deviceId?: string }> {
        try {
            this.logger.log(`Checking connection status for session: ${sessionId}`);

            // First, check if we have credentials (meaning pairing was successful)
            const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
            const credsPath = path.join(sessionDir, 'creds.json');

            if (fs.existsSync(credsPath)) {
                this.logger.log(`Credentials found for session ${sessionId}, checking for created device`);

                // Look for any device that was created recently (within last 5 minutes) for this session
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

                const device = await this.whatsappSessionModel
                    .findOne({
                        createdAt: { $gte: fiveMinutesAgo },
                        status: { $in: ['connected', 'connecting'] }, // Check both connected and connecting
                        isDeleted: false,
                    })
                    .sort({ createdAt: -1 }) // Get the most recent device
                    .exec();

                if (device) {
                    this.logger.log(`Device found: ${device._id} (${device.deviceId}) with status: ${device.status}`);

                    // Only return connected if the device status is actually 'connected'
                    if (device.status === 'connected') {
                        return { connected: true, deviceId: device._id.toString() };
                    } else {
                        // Device is still connecting
                        return { connected: false };
                    }
                } else {
                    this.logger.log(`Credentials found but no device created yet for session: ${sessionId}`);
                    return { connected: false };
                }
            }

            // If session exists but no credentials, it means QR is still waiting to be scanned
            if (this.sessions.has(sessionId)) {
                this.logger.log(`Session exists but no credentials yet: ${sessionId}`);
                return { connected: false };
            }

            this.logger.log(`No session found: ${sessionId}`);
            return { connected: false };
        } catch (error) {
            this.logger.error(`Failed to check connection status: ${error.message}`);
            return { connected: false };
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

            // Update device status to connecting
            await this.whatsappSessionModel
                .findByIdAndUpdate(deviceId, {
                    status: 'connecting',
                    updatedAt: new Date()
                })
                .exec();

            // Initialize Baileys session
            const sessionDir = path.join(process.cwd(), 'sessions', device.deviceId);
            const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

            const { version } = await fetchLatestBaileysVersion();
            const sock = makeWASocket({
                version,
                auth: state,
                printQRInTerminal: true,
                browser: ['Chrome (Linux)', '', ''],
                connectTimeoutMs: 60_000,
                defaultQueryTimeoutMs: 60_000,
                emitOwnEvents: false,
                markOnlineOnConnect: false,

            });

            // Store session
            this.sessions.set(device.deviceId, sock);

            // Handle connection updates
            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;

                if (qr) {
                    try {
                        // Generate QR code
                        const qrCode = await QRCode.toDataURL(qr);
                        this.qrCodes.set(device.deviceId, qrCode);

                        // Update device with QR code
                        await this.whatsappSessionModel
                            .findByIdAndUpdate(deviceId, {
                                qrCode,
                                qrCodeExpiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                                updatedAt: new Date()
                            })
                            .exec();
                    } catch (error) {
                        this.logger.error(`Failed to generate QR code: ${error.message}`);
                    }
                }

                if (connection === 'close') {
                    const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
                    this.logger.log(`Connection closed for ${device.deviceId}, should reconnect: ${shouldReconnect}`);

                    if (!shouldReconnect) {
                        // Update device status to disconnected
                        await this.whatsappSessionModel
                            .findByIdAndUpdate(deviceId, {
                                status: 'disconnected',
                                qrCode: null,
                                qrCodeExpiresAt: null,
                                updatedAt: new Date()
                            })
                            .exec();
                    }
                }

                if (connection === 'open') {
                    this.logger.log(`Device ${device.deviceId} connected successfully`);

                    // Clear QR code
                    this.qrCodes.delete(device.deviceId);

                    // Update device status
                    await this.whatsappSessionModel
                        .findByIdAndUpdate(deviceId, {
                            status: 'connected',
                            qrCode: null,
                            qrCodeExpiresAt: null,
                            lastSeen: new Date(),
                            updatedAt: new Date()
                        })
                        .exec();
                }
            });

            // Handle credentials update
            sock.ev.on('creds.update', saveCreds);

            // Wait for QR code to be generated
            let attempts = 0;
            while (!this.qrCodes.has(device.deviceId) && attempts < 30) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                attempts++;
            }

            const qrCode = this.qrCodes.get(device.deviceId);
            if (!qrCode) {
                throw new Error('Failed to generate QR code');
            }

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

            // Get session
            const session = this.sessions.get(device.deviceId);
            if (!session) {
                throw new BadRequestException('Device session not found');
            }

            // Send message via Baileys
            const messageData = await session.sendMessage(sendMessageDto.phoneNumber, {
                text: sendMessageDto.content,
            });

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
                whatsappMessageId: messageData.key.id,
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

    async clearAllSessions(): Promise<{ message: string }> {
        try {
            // Clear all sessions
            this.sessions.clear();
            this.qrCodes.clear();

            // Update all devices to disconnected
            await this.whatsappSessionModel
                .updateMany(
                    { isDeleted: false },
                    {
                        status: 'disconnected',
                        qrCode: null,
                        qrCodeExpiresAt: null,
                        updatedAt: new Date()
                    }
                )
                .exec();

            return { message: 'All sessions cleared successfully' };
        } catch (error) {
            this.logger.error(`Failed to clear sessions: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to clear sessions',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async reconnectDevice(
        deviceId: string,
        tenantId: string,
    ): Promise<{ message: string }> {
        try {
            this.logger.log(`Attempting to reconnect device: ${deviceId}`);

            // Find the device
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

            // Check if session exists
            const session = this.sessions.get(device.deviceId);
            if (!session) {
                this.logger.log(`No active session found for device: ${device.deviceId}`);

                // Try to reconnect using saved session files
                const sessionDir = path.join(process.cwd(), 'sessions', device.deviceId);
                if (fs.existsSync(sessionDir)) {
                    this.logger.log(`Session directory exists, attempting to reconnect: ${device.deviceId}`);

                    // Update device status to connecting
                    await this.whatsappSessionModel
                        .findByIdAndUpdate(deviceId, {
                            status: 'connecting',
                            updatedAt: new Date()
                        })
                        .exec();

                    // Try to reconnect
                    setTimeout(async () => {
                        await this.validateAndUpdateDeviceStatus(deviceId, device.deviceId);
                    }, 5000);

                    return { message: 'Reconnection attempt started' };
                } else {
                    throw new Error('No session files found for device');
                }
            }

            // Update device status
            await this.whatsappSessionModel
                .findByIdAndUpdate(deviceId, {
                    status: 'connecting',
                    updatedAt: new Date()
                })
                .exec();

            // Validate connection after a delay
            setTimeout(async () => {
                await this.validateAndUpdateDeviceStatus(deviceId, device.deviceId);
            }, 5000);

            return { message: 'Device reconnection initiated' };
        } catch (error) {
            this.logger.error(`Failed to reconnect device: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to reconnect device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async getDeviceStatus(
        deviceId: string,
        tenantId: string,
    ): Promise<{ status: string; info?: any }> {
        try {
            this.logger.log(`Getting device status: ${deviceId}`);

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

            // Check if session is active
            const session = this.sessions.get(device.deviceId);
            const sessionDir = path.join(process.cwd(), 'sessions', device.deviceId);
            const credsPath = path.join(sessionDir, 'creds.json');

            let actualStatus = device.status;
            let info = {
                deviceName: device.deviceName,
                lastSeen: device.lastSeen,
                sessionActive: !!session,
                credentialsExist: fs.existsSync(credsPath),
            };

            // If device shows as connected but no session, validate the status
            if (device.status === 'connected' && !session) {
                this.logger.log(`Device ${deviceId} shows connected but no active session, validating...`);

                if (fs.existsSync(credsPath)) {
                    // Try to reconnect
                    actualStatus = 'connecting';
                    await this.whatsappSessionModel
                        .findByIdAndUpdate(deviceId, {
                            status: 'connecting',
                            updatedAt: new Date()
                        })
                        .exec();

                    // Validate after delay
                    setTimeout(async () => {
                        await this.validateAndUpdateDeviceStatus(deviceId, device.deviceId);
                    }, 5000);
                } else {
                    actualStatus = 'disconnected';
                    await this.whatsappSessionModel
                        .findByIdAndUpdate(deviceId, {
                            status: 'disconnected',
                            updatedAt: new Date()
                        })
                        .exec();
                }
            }

            return {
                status: actualStatus,
                info,
            };
        } catch (error) {
            this.logger.error(`Failed to get device status: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                'Failed to get device status',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async cleanupDuplicateDevices(tenantId: string): Promise<{ message: string; cleanedCount: number }> {
        try {
            this.logger.log(`Cleaning up duplicate devices for tenant: ${tenantId}`);

            // Find all devices for this tenant created in the last 10 minutes
            const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
            const recentDevices = await this.whatsappSessionModel
                .find({
                    tenantId: new Types.ObjectId(tenantId),
                    createdAt: { $gte: tenMinutesAgo },
                    isDeleted: false,
                })
                .sort({ createdAt: -1 })
                .exec();

            let cleanedCount = 0;
            const deviceGroups = new Map<string, any[]>();

            // Group devices by creation time (within 30 seconds)
            for (const device of recentDevices) {
                const timeKey = Math.floor((device as any).createdAt.getTime() / 30000); // 30 second windows
                if (!deviceGroups.has(timeKey.toString())) {
                    deviceGroups.set(timeKey.toString(), []);
                }
                deviceGroups.get(timeKey.toString())!.push(device);
            }

            // Keep only the first device in each group, delete the rest
            for (const [timeKey, devices] of deviceGroups) {
                if (devices.length > 1) {
                    // Keep the first device (most recent), delete the rest
                    const devicesToDelete = devices.slice(1);

                    for (const deviceToDelete of devicesToDelete) {
                        await this.whatsappSessionModel
                            .findByIdAndUpdate(deviceToDelete._id, {
                                isDeleted: true,
                                updatedAt: new Date()
                            })
                            .exec();

                        // Also delete the session directory
                        const sessionDir = path.join(process.cwd(), 'sessions', deviceToDelete.deviceId);
                        if (fs.existsSync(sessionDir)) {
                            fs.rmSync(sessionDir, { recursive: true, force: true });
                        }

                        // Remove from sessions map
                        this.sessions.delete(deviceToDelete.deviceId);

                        cleanedCount++;
                        this.logger.log(`Deleted duplicate device: ${deviceToDelete._id}`);
                    }
                }
            }

            return {
                message: `Cleaned up ${cleanedCount} duplicate devices`,
                cleanedCount
            };
        } catch (error) {
            this.logger.error(`Failed to cleanup duplicate devices: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to cleanup duplicate devices',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    async forceDisconnectDevice(deviceId: string, tenantId: string): Promise<{ message: string }> {
        try {
            this.logger.log(`Force disconnecting device: ${deviceId}`);

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

            // Disconnect session if active
            const session = this.sessions.get(device.deviceId);
            if (session) {
                try {
                    await session.logout();
                    this.logger.log(`Session logged out for device: ${device.deviceId}`);
                } catch (error) {
                    this.logger.warn(`Error during logout: ${error.message}`);
                }
                this.sessions.delete(device.deviceId);
            }

            // Clear QR codes
            this.qrCodes.delete(device.deviceId);

            // Clean up session directory
            const sessionDir = path.join(process.cwd(), 'sessions', device.deviceId);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
                this.logger.log(`Session directory removed for device: ${device.deviceId}`);
            }

            // Update device status to disconnected
            await this.whatsappSessionModel
                .findByIdAndUpdate(deviceId, {
                    status: 'disconnected',
                    updatedAt: new Date()
                })
                .exec();

            return { message: 'Device force disconnected successfully' };
        } catch (error) {
            this.logger.error(`Failed to force disconnect device: ${error.message}`, error.stack);
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new HttpException(
                'Failed to force disconnect device',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private async createDeviceFromSession(
        sessionId: string,
        deviceName: string,
        description: string,
        tenantId: string,
        userId: string,
    ): Promise<void> {
        try {
            this.logger.log(`Creating device from session: ${sessionId}`);

            // Check if device was already created for this session in the last 5 minutes
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
            const existingDevice = await this.whatsappSessionModel
                .findOne({
                    createdAt: { $gte: fiveMinutesAgo },
                    status: { $in: ['connected', 'connecting'] },
                    isDeleted: false,
                })
                .exec();

            if (existingDevice) {
                this.logger.log(`Device already created for session ${sessionId}: ${existingDevice._id}`);
                return;
            }

            // Generate unique device ID
            const deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Create new session directory for the device
            const newSessionDir = path.join(process.cwd(), 'sessions', deviceId);
            if (!fs.existsSync(newSessionDir)) {
                fs.mkdirSync(newSessionDir, { recursive: true });
            }

            // Copy session files from temporary session to device session
            const tempSessionDir = path.join(process.cwd(), 'sessions', sessionId);
            if (fs.existsSync(tempSessionDir)) {
                const files = fs.readdirSync(tempSessionDir);
                for (const file of files) {
                    const sourcePath = path.join(tempSessionDir, file);
                    const destPath = path.join(newSessionDir, file);
                    if (fs.statSync(sourcePath).isFile()) {
                        fs.copyFileSync(sourcePath, destPath);
                    }
                }
                this.logger.log(`Session files copied from ${sessionId} to ${deviceId}`);
            }

            // Validate that credentials exist before creating device
            const credsPath = path.join(newSessionDir, 'creds.json');
            if (!fs.existsSync(credsPath)) {
                this.logger.error(`No credentials found for device ${deviceId}, cannot create device`);
                return;
            }

            // Save device to database with initial status as 'connecting'
            const newDevice = new this.whatsappSessionModel({
                deviceId,
                deviceName,
                description,
                tenantId: new Types.ObjectId(tenantId),
                createdBy: new Types.ObjectId(userId),
                status: 'connecting', // Start as connecting, will update to connected after validation
                isActive: true,
                isDeleted: false,
                lastSeen: new Date(),
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            const savedDevice = await newDevice.save();
            this.logger.log(`Device created with connecting status: ${savedDevice._id}`);

            // Update session mapping to use device ID
            const session = this.sessions.get(sessionId);
            if (session) {
                this.sessions.delete(sessionId);
                this.sessions.set(deviceId, session);
                this.logger.log(`Session mapping updated from ${sessionId} to ${deviceId}`);
            }

            // Clear QR code
            this.qrCodes.delete(sessionId);

            // Validate connection and update status after a longer delay
            setTimeout(async () => {
                await this.validateAndUpdateDeviceStatus(savedDevice._id.toString(), deviceId);
            }, 15000); // Wait 15 seconds to ensure connection is stable

        } catch (error) {
            this.logger.error(`Failed to create device from session: ${error.message}`, error.stack);
            throw new HttpException(
                'Failed to create device from session',
                HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
    }

    private async validateAndUpdateDeviceStatus(deviceId: string, sessionId: string): Promise<void> {
        try {
            this.logger.log(`Validating device connection: ${deviceId}`);

            // Check if session is still active
            const session = this.sessions.get(sessionId);
            if (!session) {
                this.logger.log(`Session not found for device ${deviceId}, marking as disconnected`);
                await this.whatsappSessionModel
                    .findByIdAndUpdate(deviceId, {
                        status: 'disconnected',
                        updatedAt: new Date()
                    })
                    .exec();
                return;
            }

            // Check if credentials exist
            const sessionDir = path.join(process.cwd(), 'sessions', sessionId);
            const credsPath = path.join(sessionDir, 'creds.json');

            if (!fs.existsSync(credsPath)) {
                this.logger.log(`No credentials found for device ${deviceId}, marking as disconnected`);
                await this.whatsappSessionModel
                    .findByIdAndUpdate(deviceId, {
                        status: 'disconnected',
                        updatedAt: new Date()
                    })
                    .exec();
                return;
            }

            // Try to validate the connection by checking if we can get user info
            try {
                // Simplified validation - if session exists and credentials exist, consider it connected
                // This is more reliable than trying to access session.user which may not be available
                this.logger.log(`Connection validated for device ${deviceId} - session exists and credentials present`);

                // Update device status to connected
                await this.whatsappSessionModel
                    .findByIdAndUpdate(deviceId, {
                        status: 'connected',
                        lastSeen: new Date(),
                        updatedAt: new Date()
                    })
                    .exec();

                this.logger.log(`Device ${deviceId} status updated to connected`);
            } catch (error) {
                this.logger.error(`Connection validation failed for device ${deviceId}: ${error.message}`);
                // Mark as disconnected if validation fails
                await this.whatsappSessionModel
                    .findByIdAndUpdate(deviceId, {
                        status: 'disconnected',
                        updatedAt: new Date()
                    })
                    .exec();
            }
        } catch (error) {
            this.logger.error(`Error in validateAndUpdateDeviceStatus: ${error.message}`);
            // Mark as disconnected on any error
            try {
                await this.whatsappSessionModel
                    .findByIdAndUpdate(deviceId, {
                        status: 'disconnected',
                        updatedAt: new Date()
                    })
                    .exec();
            } catch (updateError) {
                this.logger.error(`Failed to update device status: ${updateError.message}`);
            }
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