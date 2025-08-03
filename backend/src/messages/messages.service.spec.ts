import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { MessagesService } from './messages.service';
import { Message } from '../database/schemas/message.schema';
import { WhatsAppSession } from '../database/schemas/whatsapp-session.schema';
import { QueryMessagesDto } from './dto/query-messages.dto';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockMessageModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn().mockReturnThis(),
    findByIdAndUpdate: jest.fn().mockReturnThis(),
    countDocuments: jest.fn().mockReturnThis(),
    aggregate: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    populate: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  const mockWhatsAppSessionModel = {
    find: jest.fn().mockReturnThis(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
        {
          provide: getModelToken(WhatsAppSession.name),
          useValue: mockWhatsAppSessionModel,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllMessages', () => {
    it('should return paginated messages', async () => {
      const query: QueryMessagesDto = { page: 1, limit: 10 };
      const tenantId = '507f1f77bcf86cd799439012';
      const mockMessages = [
        {
          _id: new Types.ObjectId(),
          deviceId: {
            _id: new Types.ObjectId(),
            deviceName: 'Device 1',
          },
          phoneNumber: '+1234567890',
          messageType: 'text',
          content: 'Hello',
          caption: undefined,
          groupId: {
            _id: new Types.ObjectId(),
            name: 'Group 1',
          },
          replyToMessageId: undefined,
          mentionedPhoneNumbers: [],
          broadcast: false,
          status: 'sent',
          whatsappMessageId: 'msg123',
          errorMessage: undefined,
          tenantId: new Types.ObjectId(tenantId),
          sentBy: {
            _id: new Types.ObjectId(),
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
          },
          sentAt: new Date(),
          deliveredAt: undefined,
          readAt: undefined,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      mockMessageModel.exec.mockResolvedValueOnce(mockMessages);
      mockMessageModel.exec.mockResolvedValueOnce(1);
      const result = await service.findAllMessages(query, tenantId);
      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });
  });

  describe('findMessageById', () => {
    it('should return message by ID', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockMessage = {
        _id: new Types.ObjectId(messageId),
        deviceId: {
          _id: new Types.ObjectId(),
          deviceName: 'Device 1',
        },
        phoneNumber: '+1234567890',
        messageType: 'text',
        content: 'Hello',
        caption: undefined,
        groupId: {
          _id: new Types.ObjectId(),
          name: 'Group 1',
        },
        replyToMessageId: undefined,
        mentionedPhoneNumbers: [],
        broadcast: false,
        status: 'sent',
        whatsappMessageId: 'msg123',
        errorMessage: undefined,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: {
          _id: new Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        sentAt: new Date(),
        deliveredAt: undefined,
        readAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMessageModel.exec.mockResolvedValue(mockMessage);
      const result = await service.findMessageById(messageId, tenantId);
      expect(result.id).toBe(messageId);
      expect(result.phoneNumber).toBe('+1234567890');
    });
    it('should throw NotFoundException for non-existent message', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      mockMessageModel.exec.mockResolvedValue(null);
      await expect(
        service.findMessageById(messageId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getMessageStats', () => {
    it('should return message stats', async () => {
      mockMessageModel.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(10),
      });
      mockMessageModel.aggregate.mockReturnValueOnce([
        { _id: 'sent', count: 5 },
        { _id: 'delivered', count: 3 },
      ]);
      mockMessageModel.aggregate.mockReturnValueOnce([
        { _id: 'text', count: 8 },
      ]);
      mockMessageModel.aggregate.mockReturnValueOnce([
        { deviceId: 'dev1', deviceName: 'Device 1', count: 5 },
      ]);
      const result = await service.getMessageStats('507f1f77bcf86cd799439012');
      expect(result.totalMessages).toBe(10);
      expect(result.sentMessages).toBe(5);
      expect(result.deliveredMessages).toBe(3);
      expect(result.messagesByType['text']).toBe(8);
      expect(result.messagesByDevice[0].deviceName).toBe('Device 1');
    });
  });

  describe('updateMessageStatus', () => {
    it('should update message status', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockMessage = {
        _id: new Types.ObjectId(messageId),
        deviceId: {
          _id: new Types.ObjectId(),
          deviceName: 'Device 1',
        },
        phoneNumber: '+1234567890',
        messageType: 'text',
        content: 'Hello',
        caption: undefined,
        groupId: {
          _id: new Types.ObjectId(),
          name: 'Group 1',
        },
        replyToMessageId: undefined,
        mentionedPhoneNumbers: [],
        broadcast: false,
        status: 'sent',
        whatsappMessageId: 'msg123',
        errorMessage: undefined,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: {
          _id: new Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        sentAt: new Date(),
        deliveredAt: undefined,
        readAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMessageModel.exec.mockResolvedValueOnce(mockMessage);
      // Mock the updated message with 'delivered' status
      const updatedMockMessage = {
        ...mockMessage,
        status: 'delivered',
        deliveredAt: new Date(),
      };
      mockMessageModel.exec.mockResolvedValueOnce(updatedMockMessage);
      const result = await service.updateMessageStatus(
        messageId,
        'delivered',
        tenantId,
      );
      expect(result.status).toBe('delivered');
    });
    it('should throw NotFoundException for non-existent message', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      mockMessageModel.exec.mockResolvedValue(null);
      await expect(
        service.updateMessageStatus(messageId, 'sent', tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('should delete message (soft delete)', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockMessage = {
        _id: new Types.ObjectId(messageId),
        deviceId: {
          _id: new Types.ObjectId(),
          deviceName: 'Device 1',
        },
        phoneNumber: '+1234567890',
        messageType: 'text',
        content: 'Hello',
        caption: undefined,
        groupId: {
          _id: new Types.ObjectId(),
          name: 'Group 1',
        },
        replyToMessageId: undefined,
        mentionedPhoneNumbers: [],
        broadcast: false,
        status: 'sent',
        whatsappMessageId: 'msg123',
        errorMessage: undefined,
        tenantId: new Types.ObjectId(tenantId),
        sentBy: {
          _id: new Types.ObjectId(),
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@example.com',
        },
        sentAt: new Date(),
        deliveredAt: undefined,
        readAt: undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockMessageModel.exec.mockResolvedValueOnce(mockMessage);
      mockMessageModel.exec.mockResolvedValueOnce({ modifiedCount: 1 });
      const result = await service.deleteMessage(messageId, tenantId);
      expect(result.message).toBe('Message deleted successfully');
    });
    it('should throw NotFoundException for non-existent message', async () => {
      const messageId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      mockMessageModel.exec.mockResolvedValue(null);
      await expect(service.deleteMessage(messageId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
