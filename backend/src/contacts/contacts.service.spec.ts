import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ContactsService } from './contacts.service';
import { Contact } from '../database/schemas/contact.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateContactDto } from './dto/create-contact.dto';

describe('ContactsService', () => {
  let service: ContactsService;

  // Create a mock constructor function with proper typing
  const MockContactModel = jest.fn().mockImplementation(() => ({
    save: jest.fn().mockResolvedValue({
      _id: new Types.ObjectId(),
      phoneNumber: '+1234567890',
      firstName: 'John',
      lastName: 'Doe',
      tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
      createdBy: new Types.ObjectId('507f1f77bcf86cd799439013'),
      isDeleted: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      messagesSent: 0,
      messagesReceived: 0,
    }),
  })) as any;

  const mockMessageModel = {
    find: jest.fn().mockReturnThis(),
    exec: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContactsService,
        {
          provide: getModelToken(Contact.name),
          useValue: MockContactModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createContact', () => {
    it('should create contact successfully', async () => {
      const createContactDto: CreateContactDto = {
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      };
      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      // Mock the static methods on the constructor
      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.populate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest
        .fn()
        .mockResolvedValueOnce(null) // No existing contact
        .mockResolvedValueOnce({
          // Populated contact
          _id: new Types.ObjectId(),
          phoneNumber: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          tenantId: new Types.ObjectId('507f1f77bcf86cd799439012'),
          createdBy: {
            _id: new Types.ObjectId('507f1f77bcf86cd799439013'),
            firstName: 'Test',
            lastName: 'User',
            email: 'test@example.com',
          },
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          messagesSent: 0,
          messagesReceived: 0,
        });

      const result = await service.createContact(
        createContactDto,
        tenantId,
        userId,
      );
      expect(result.phoneNumber).toBe(createContactDto.phoneNumber);
      expect(result.firstName).toBe('John');
      expect(result.lastName).toBe('Doe');
    });

    it('should throw BadRequestException for duplicate contact', async () => {
      const createContactDto: CreateContactDto = {
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
      };
      const tenantId = '507f1f77bcf86cd799439012';
      const userId = '507f1f77bcf86cd799439013';

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.populate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest
        .fn()
        .mockResolvedValueOnce({ _id: new Types.ObjectId() }); // Existing contact

      await expect(
        service.createContact(createContactDto, tenantId, userId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllContacts', () => {
    it('should return all contacts for tenant', async () => {
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContacts = [
        {
          _id: new Types.ObjectId(),
          phoneNumber: '+1234567890',
          firstName: 'John',
          lastName: 'Doe',
          tenantId: new Types.ObjectId(tenantId),
          createdBy: {
            _id: new Types.ObjectId(),
            firstName: 'Admin',
            lastName: 'User',
            email: 'admin@example.com',
          },
          isDeleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          messagesSent: 0,
          messagesReceived: 0,
        },
      ];
      MockContactModel.find = jest.fn().mockReturnThis();
      MockContactModel.populate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(mockContacts);

      const result = await service.findAllContacts(tenantId);
      expect(result).toHaveLength(1);
      expect(result[0].phoneNumber).toBe('+1234567890');
    });
  });

  describe('findContactById', () => {
    it('should return contact by ID', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContact = {
        _id: new Types.ObjectId(contactId),
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        createdBy: {
          _id: new Types.ObjectId(),
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
        },
        isDeleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        messagesSent: 0,
        messagesReceived: 0,
      };
      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.populate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(mockContact);

      const result = await service.findContactById(contactId, tenantId);
      expect(result.id).toBe(contactId);
      expect(result.phoneNumber).toBe('+1234567890');
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.populate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(null);

      await expect(
        service.findContactById(contactId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const updateContactDto = { firstName: 'Jane' };
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContact = {
        _id: new Types.ObjectId(contactId),
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };
      const mockUpdatedContact = {
        ...mockContact,
        ...updateContactDto,
        createdBy: {
          _id: new Types.ObjectId(),
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@example.com',
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the first findOne call (checking if contact exists)
      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest
        .fn()
        .mockResolvedValueOnce(mockContact) // First call for finding contact
        .mockResolvedValueOnce(null); // Second call for checking duplicate phone (if phone number is being updated)

      // Mock the findByIdAndUpdate chain
      const mockFindByIdAndUpdateChain = {
        populate: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue(mockUpdatedContact),
      };
      MockContactModel.findByIdAndUpdate = jest
        .fn()
        .mockReturnValue(mockFindByIdAndUpdateChain);

      const result = await service.updateContact(
        contactId,
        updateContactDto,
        tenantId,
      );
      expect(result.firstName).toBe('Jane');
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(null);

      await expect(
        service.updateContact(contactId, { firstName: 'Jane' }, tenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for duplicate phone number', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const updateContactDto = { phoneNumber: '+1234567890' };
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContact = {
        _id: new Types.ObjectId(contactId),
        phoneNumber: '+1111111111',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
        messagesSent: 0,
        messagesReceived: 0,
      };

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest
        .fn()
        .mockResolvedValueOnce(mockContact) // First call for finding contact
        .mockResolvedValueOnce({ _id: new Types.ObjectId() }); // Second call for duplicate phone

      await expect(
        service.updateContact(contactId, updateContactDto, tenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteContact', () => {
    it('should delete contact (soft delete)', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContact = {
        _id: new Types.ObjectId(contactId),
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };
      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.findByIdAndUpdate = jest.fn().mockReturnThis();
      MockContactModel.exec = jest
        .fn()
        .mockResolvedValueOnce(mockContact) // First call for finding contact
        .mockResolvedValueOnce({ modifiedCount: 1 }); // Second call for update

      const result = await service.deleteContact(contactId, tenantId);
      expect(result.message).toBe('Contact deleted successfully');
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(null);

      await expect(service.deleteContact(contactId, tenantId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getContactStats', () => {
    it('should return contact stats', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';
      const mockContact = {
        _id: new Types.ObjectId(contactId),
        phoneNumber: '+1234567890',
        firstName: 'John',
        lastName: 'Doe',
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      };
      const mockMessages = [
        {
          _id: new Types.ObjectId(),
          content: 'Hello',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        },
        {
          _id: new Types.ObjectId(),
          content: 'Hi',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        },
      ];
      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(mockContact);
      mockMessageModel.exec = jest.fn().mockResolvedValue(mockMessages);

      const result = await service.getContactStats(contactId, tenantId);
      expect(result.totalMessages).toBe(2);
      expect(result.sentMessages).toBe(2);
      expect(result.messageHistory).toHaveLength(2);
    });

    it('should throw NotFoundException for non-existent contact', async () => {
      const contactId = '507f1f77bcf86cd799439011';
      const tenantId = '507f1f77bcf86cd799439012';

      MockContactModel.findOne = jest.fn().mockReturnThis();
      MockContactModel.exec = jest.fn().mockResolvedValue(null);

      await expect(
        service.getContactStats(contactId, tenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
