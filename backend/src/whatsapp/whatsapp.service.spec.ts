import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import {
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { Types } from 'mongoose';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppSession } from '../database/schemas/whatsapp-session.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateDeviceDto } from './dto/create-device.dto';
import { UpdateDeviceDto } from './dto/update-device.dto';
import { SendMessageDto, MessageType } from './dto/send-message.dto';

describe('WhatsAppService', () => {
  let service: WhatsAppService;

  const mockWhatsAppSessionModel = {
    findOne: jest.fn().mockReturnThis(),
    find: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    save: jest.fn(),
    exec: jest.fn(),
    populate: jest.fn().mockReturnThis(),
  };

  const MockWhatsAppSessionModel = jest
    .fn()
    .mockImplementation(() => mockWhatsAppSessionModel) as any;

  // Add static methods to the constructor that return the same chain
  MockWhatsAppSessionModel.findOne = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  });
  MockWhatsAppSessionModel.find = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([]),
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  });
  MockWhatsAppSessionModel.findByIdAndUpdate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue(null),
    populate: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    }),
  });

  const mockMessageModel = {
    save: jest.fn(),
  };

  const MockMessageModel = jest.fn().mockImplementation(() => mockMessageModel);

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WhatsAppService,
        {
          provide: getModelToken(WhatsAppSession.name),
          useValue: MockWhatsAppSessionModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: MockMessageModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<WhatsAppService>(WhatsAppService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDevice', () => {
    it('should create device successfully', async () => {
      const createDeviceDto: CreateDeviceDto = {
        name: 'Test Device',
        description: 'Test device description',
        isActive: true,
      };

      const tenantId = '507f1f77bcf86cd799439012';

      const mockWahaDeviceId = 'waha-device-123';
      const mockSavedDevice = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        deviceId: mockWahaDeviceId,
        deviceName: createDeviceDto.name,
        description: createDeviceDto.description,
        tenantId: new Types.ObjectId(tenantId),
        status: 'disconnected',
        isActive: createDeviceDto.isActive,
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
      };

      // Mock WAHA API call
      jest
        .spyOn(service as any, 'createWahaDevice')
        .mockResolvedValue(mockWahaDeviceId);

      // Mock device save
      mockWhatsAppSessionModel.save.mockResolvedValue(mockSavedDevice);

      const result = await service.createDevice(createDeviceDto, tenantId);

      expect(result.id).toBe((mockSavedDevice._id as any).toString());
      expect(result.name).toBe(createDeviceDto.name);
      expect(result.description).toBe(createDeviceDto.description);
      expect(result.status).toBe('disconnected');
      expect(result.isActive).toBe(createDeviceDto.isActive);
      expect(result.tenantId).toBe(tenantId);
    });

    it('should create device with default isActive value', async () => {
      const createDeviceDto: CreateDeviceDto = {
        name: 'Test Device',
      };

      const tenantId = '507f1f77bcf86cd799439012';

      const mockWahaDeviceId = 'waha-device-123';
      const mockSavedDevice = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
        deviceId: mockWahaDeviceId,
        deviceName: createDeviceDto.name,
        tenantId: new Types.ObjectId(tenantId),
        status: 'disconnected',
        isActive: true, // Default value
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
      };

      jest
        .spyOn(service as any, 'createWahaDevice')
        .mockResolvedValue(mockWahaDeviceId);
      mockWhatsAppSessionModel.save.mockResolvedValue(mockSavedDevice);

      const result = await service.createDevice(createDeviceDto, tenantId);

      expect(result.isActive).toBe(true);
    });

    it('should throw HttpException when WAHA API fails', async () => {
      const createDeviceDto: CreateDeviceDto = {
        name: 'Test Device',
      };

      const tenantId = '507f1f77bcf86cd799439012';

      jest
        .spyOn(service as any, 'createWahaDevice')
        .mockRejectedValue(new HttpException('WAHA API Error', 500));

      await expect(
        service.createDevice(createDeviceDto, tenantId),
      ).rejects.toThrow(HttpException);
    });
  });

  describe('findAllDevices', () => {
    it('should return all devices for tenant', async () => {
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevices = [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439011'),
          deviceId: 'waha-device-1',
          deviceName: 'Device 1',
          description: 'First device',
          tenantId: new Types.ObjectId(tenantId),
          status: 'connected',
          isActive: true,
          isDeleted: false,
          messagesSent: 10,
          messagesReceived: 5,
          lastSeen: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
        },
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439012'),
          deviceId: 'waha-device-2',
          deviceName: 'Device 2',
          description: 'Second device',
          tenantId: new Types.ObjectId(tenantId),
          status: 'disconnected',
          isActive: false,
          isDeleted: false,
          messagesSent: 5,
          messagesReceived: 2,
          createdAt: new Date(),
          updatedAt: new Date(),
          createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
        },
      ];

      MockWhatsAppSessionModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockDevices),
        }),
      });

      const result = await service.findAllDevices(tenantId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe((mockDevices[0]._id as any).toString());
      expect(result[0].name).toBe('Device 1');
      expect(result[0].status).toBe('connected');
      expect(result[1].id).toBe((mockDevices[1]._id as any).toString());
      expect(result[1].name).toBe('Device 2');
      expect(result[1].status).toBe('disconnected');
    });

    it('should return empty array when no devices exist', async () => {
      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.find.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      });

      const result = await service.findAllDevices(tenantId);

      expect(result).toHaveLength(0);
    });
  });

  describe('findDeviceById', () => {
    it('should return device by ID', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        description: 'Test device description',
        tenantId: new Types.ObjectId(tenantId),
        status: 'connected',
        isActive: true,
        isDeleted: false,
        messagesSent: 15,
        messagesReceived: 8,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockDevice),
        }),
      });

      const result = await service.findDeviceById(deviceId, tenantId);

      expect(result.id).toBe(deviceId);
      expect(result.name).toBe('Test Device');
      expect(result.description).toBe('Test device description');
      expect(result.status).toBe('connected');
      expect(result.isActive).toBe(true);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      await expect(service.findDeviceById(deviceId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateDevice', () => {
    it('should update device successfully', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const updateDeviceDto: UpdateDeviceDto = {
        name: 'Updated Device',
        description: 'Updated description',
        isActive: false,
      };

      const tenantId = '507f1f77bcf86cd799439012';

      const mockExistingDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Old Device',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      const mockUpdatedDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: updateDeviceDto.name,
        description: updateDeviceDto.description,
        tenantId: new Types.ObjectId(tenantId),
        status: 'connected',
        isActive: updateDeviceDto.isActive,
        isDeleted: false,
        messagesSent: 15,
        messagesReceived: 8,
        lastSeen: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: { _id: new Types.ObjectId('507f1f77bcf86cd799439013') },
      };

      MockWhatsAppSessionModel.findOne.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockExistingDevice),
      });
      MockWhatsAppSessionModel.findByIdAndUpdate.mockReturnValueOnce({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockUpdatedDevice),
        }),
      });

      const result = await service.updateDevice(
        deviceId,
        updateDeviceDto,
        tenantId,
      );

      expect(result.name).toBe(updateDeviceDto.name);
      expect(result.description).toBe(updateDeviceDto.description);
      expect(result.isActive).toBe(updateDeviceDto.isActive);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const updateDeviceDto: UpdateDeviceDto = {
        name: 'Updated Device',
      };

      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateDevice(deviceId, updateDeviceDto, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteDevice', () => {
    it('should delete device successfully', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });
      MockWhatsAppSessionModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
      });

      // Mock WAHA API call
      jest
        .spyOn(service as any, 'disconnectWahaDevice')
        .mockResolvedValue(undefined);

      const result = await service.deleteDevice(deviceId, tenantId);

      expect(result.message).toBe('Device deleted successfully');
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.deleteDevice(deviceId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('generateQRCode', () => {
    it('should generate QR code successfully', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      const mockQrData = {
        qr: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
        timeout: 300,
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });

      // Mock WAHA API call
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockQrData),
      });

      const result = await service.generateQRCode(deviceId, tenantId);

      expect(result.qrCode).toBe(mockQrData.qr);
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.generateQRCode(deviceId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw HttpException when WAHA API fails', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      mockWhatsAppSessionModel.exec.mockResolvedValue(mockDevice);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      await expect(service.generateQRCode(deviceId, tenantId)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe('getDeviceStatus', () => {
    it('should return device status successfully', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      const mockDevice = {
        _id: new Types.ObjectId(deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };

      const mockStatusData = {
        state: 'connected',
        lastSeen: new Date().toISOString(),
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockStatusData),
      });

      const result = await service.getDeviceStatus(deviceId, tenantId);

      expect(result.status).toBe(mockStatusData.state);
      expect(result.info).toEqual(mockStatusData);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const deviceId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getDeviceStatus(deviceId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const sendMessageDto: SendMessageDto = {
        deviceId: '507f1f77bcf86cd799439011',
        phoneNumber: '+1234567890',
        messageType: MessageType.TEXT,
        content: 'Hello, this is a test message!',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const mockDevice = {
        _id: new Types.ObjectId(sendMessageDto.deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        status: 'connected',
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };

      const mockWahaResponse = {
        id: 'waha-message-123',
        status: 'sent',
      };

      const mockSavedMessage = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
        deviceId: new Types.ObjectId(sendMessageDto.deviceId),
        phoneNumber: sendMessageDto.phoneNumber,
        messageType: sendMessageDto.messageType,
        content: sendMessageDto.content,
        status: 'sent',
        whatsappMessageId: mockWahaResponse.id,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: new Types.ObjectId(userId),
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWahaResponse),
      });

      mockMessageModel.save.mockResolvedValue(mockSavedMessage);

      const result = await service.sendMessage(
        sendMessageDto,
        tenantId,
        userId,
      );

      expect(result.id).toBe((mockSavedMessage._id as any).toString());
      expect(result.deviceId).toBe(sendMessageDto.deviceId);
      expect(result.phoneNumber).toBe(sendMessageDto.phoneNumber);
      expect(result.messageType).toBe(sendMessageDto.messageType);
      expect(result.content).toBe(sendMessageDto.content);
      expect(result.status).toBe('sent');
      expect(result.whatsappMessageId).toBe(mockWahaResponse.id);
    });

    it('should send media message successfully', async () => {
      const sendMessageDto: SendMessageDto = {
        deviceId: '507f1f77bcf86cd799439011',
        phoneNumber: '+1234567890',
        messageType: MessageType.IMAGE,
        content: 'https://example.com/image.jpg',
        caption: 'Check out this image!',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const mockDevice = {
        _id: new Types.ObjectId(sendMessageDto.deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        status: 'connected',
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };

      const mockWahaResponse = {
        id: 'waha-message-123',
        status: 'sent',
      };

      const mockSavedMessage = {
        _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
        deviceId: new Types.ObjectId(sendMessageDto.deviceId),
        phoneNumber: sendMessageDto.phoneNumber,
        messageType: sendMessageDto.messageType,
        content: sendMessageDto.content,
        caption: sendMessageDto.caption,
        status: 'sent',
        whatsappMessageId: mockWahaResponse.id,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: new Types.ObjectId(userId),
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue(mockWahaResponse),
      });

      mockMessageModel.save.mockResolvedValue(mockSavedMessage);

      const result = await service.sendMessage(
        sendMessageDto,
        tenantId,
        userId,
      );

      expect(result.messageType).toBe(MessageType.IMAGE);
      expect(result.caption).toBe(sendMessageDto.caption);
    });

    it('should throw NotFoundException for non-existent device', async () => {
      const sendMessageDto: SendMessageDto = {
        deviceId: '507f1f77bcf86cd799439011',
        phoneNumber: '+1234567890',
        messageType: MessageType.TEXT,
        content: 'Hello!',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.sendMessage(sendMessageDto, tenantId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for inactive device', async () => {
      const sendMessageDto: SendMessageDto = {
        deviceId: '507f1f77bcf86cd799439011',
        phoneNumber: '+1234567890',
        messageType: MessageType.TEXT,
        content: 'Hello!',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const mockDevice = {
        _id: new Types.ObjectId(sendMessageDto.deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isActive: false,
        status: 'connected',
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };

      MockWhatsAppSessionModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDevice),
      });

      await expect(
        service.sendMessage(sendMessageDto, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw HttpException when WAHA API fails', async () => {
      const sendMessageDto: SendMessageDto = {
        deviceId: '507f1f77bcf86cd799439011',
        phoneNumber: '+1234567890',
        messageType: MessageType.TEXT,
        content: 'Hello!',
      };

      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      const mockDevice = {
        _id: new Types.ObjectId(sendMessageDto.deviceId),
        deviceId: 'waha-device-123',
        deviceName: 'Test Device',
        tenantId: new Types.ObjectId(tenantId),
        isActive: true,
        status: 'connected',
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };

      mockWhatsAppSessionModel.exec.mockResolvedValue(mockDevice);

      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: jest.fn().mockResolvedValue({ error: 'WAHA API Error' }),
      });

      await expect(
        service.sendMessage(sendMessageDto, tenantId, userId),
      ).rejects.toThrow(HttpException);
    });
  });
});
