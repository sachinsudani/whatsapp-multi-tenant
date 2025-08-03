import { Test, TestingModule } from '@nestjs/testing';
import { ContactsController } from './contacts.controller';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ContactsController', () => {
  let controller: ContactsController;
  let service: ContactsService;

  const mockContactsService = {
    createContact: jest.fn(),
    findAllContacts: jest.fn(),
    findContactById: jest.fn(),
    updateContact: jest.fn(),
    deleteContact: jest.fn(),
    getContactStats: jest.fn(),
  };

  const mockUser = {
    userId: '507f1f77bcf86cd799439011',
    tenantId: '507f1f77bcf86cd799439012',
    email: 'test@example.com',
  };

  const mockCreateContactDto: CreateContactDto = {
    phoneNumber: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    company: 'Acme Corp',
    jobTitle: 'Software Engineer',
    notes: 'Important client',
    tags: ['client', 'priority'],
  };

  const mockContactResponse: ContactResponseDto = {
    id: '507f1f77bcf86cd799439013',
    phoneNumber: '+1234567890',
    firstName: 'John',
    lastName: 'Doe',
    fullName: 'John Doe',
    email: 'john.doe@example.com',
    company: 'Acme Corp',
    jobTitle: 'Software Engineer',
    notes: 'Important client',
    tags: ['client', 'priority'],
    messagesSent: 0,
    messagesReceived: 0,
    lastMessageAt: undefined,
    tenantId: '507f1f77bcf86cd799439012',
    createdBy: '507f1f77bcf86cd799439011',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContactsController],
      providers: [
        {
          provide: ContactsService,
          useValue: mockContactsService,
        },
      ],
    }).compile();

    controller = module.get<ContactsController>(ContactsController);
    service = module.get<ContactsService>(ContactsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createContact', () => {
    it('should create a new contact successfully', async () => {
      mockContactsService.createContact.mockResolvedValue(mockContactResponse);

      const result = await controller.createContact(mockCreateContactDto, {
        user: mockUser,
      } as any);

      expect(service.createContact).toHaveBeenCalledWith(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );
      expect(result).toEqual(mockContactResponse);
    });

    it('should throw BadRequestException when contact already exists', async () => {
      mockContactsService.createContact.mockRejectedValue(
        new BadRequestException(
          'Contact with this phone number already exists',
        ),
      );

      await expect(
        controller.createContact(mockCreateContactDto, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllContacts', () => {
    it('should return all contacts for tenant', async () => {
      const mockContacts = [mockContactResponse];
      mockContactsService.findAllContacts.mockResolvedValue(mockContacts);

      const result = await controller.findAllContacts({
        user: mockUser,
      } as any);

      expect(service.findAllContacts).toHaveBeenCalledWith(mockUser.tenantId);
      expect(result).toEqual(mockContacts);
    });

    it('should return empty array when no contacts exist', async () => {
      mockContactsService.findAllContacts.mockResolvedValue([]);

      const result = await controller.findAllContacts({
        user: mockUser,
      } as any);

      expect(result).toEqual([]);
    });
  });

  describe('findContactById', () => {
    it('should return contact by ID', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      mockContactsService.findContactById.mockResolvedValue(
        mockContactResponse,
      );

      const result = await controller.findContactById(contactId, {
        user: mockUser,
      } as any);

      expect(service.findContactById).toHaveBeenCalledWith(
        contactId,
        mockUser.tenantId,
      );
      expect(result).toEqual(mockContactResponse);
    });

    it('should throw NotFoundException when contact not found', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      mockContactsService.findContactById.mockRejectedValue(
        new NotFoundException('Contact not found'),
      );

      await expect(
        controller.findContactById(contactId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateContact', () => {
    it('should update contact successfully', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      const updateDto = { firstName: 'Jane' };
      const updatedContact = { ...mockContactResponse, firstName: 'Jane' };
      mockContactsService.updateContact.mockResolvedValue(updatedContact);

      const result = await controller.updateContact(contactId, updateDto, {
        user: mockUser,
      } as any);

      expect(service.updateContact).toHaveBeenCalledWith(
        contactId,
        updateDto,
        mockUser.tenantId,
      );
      expect(result).toEqual(updatedContact);
    });

    it('should throw NotFoundException when contact not found', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      const updateDto = { firstName: 'Jane' };
      mockContactsService.updateContact.mockRejectedValue(
        new NotFoundException('Contact not found'),
      );

      await expect(
        controller.updateContact(contactId, updateDto, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteContact', () => {
    it('should delete contact successfully', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      const deleteResponse = { message: 'Contact deleted successfully' };
      mockContactsService.deleteContact.mockResolvedValue(deleteResponse);

      const result = await controller.deleteContact(contactId, {
        user: mockUser,
      } as any);

      expect(service.deleteContact).toHaveBeenCalledWith(
        contactId,
        mockUser.tenantId,
      );
      expect(result).toEqual(deleteResponse);
    });

    it('should throw NotFoundException when contact not found', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      mockContactsService.deleteContact.mockRejectedValue(
        new NotFoundException('Contact not found'),
      );

      await expect(
        controller.deleteContact(contactId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getContactStats', () => {
    it('should return contact statistics', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      const mockStats = {
        totalMessages: 25,
        sentMessages: 15,
        receivedMessages: 10,
        lastMessageAt: new Date(),
        messageHistory: [
          {
            id: '507f1f77bcf86cd799439014',
            content: 'Hello',
            messageType: 'text',
            status: 'sent',
            sentAt: new Date(),
            direction: 'sent' as const,
          },
        ],
      };
      mockContactsService.getContactStats.mockResolvedValue(mockStats);

      const result = await controller.getContactStats(contactId, {
        user: mockUser,
      } as any);

      expect(service.getContactStats).toHaveBeenCalledWith(
        contactId,
        mockUser.tenantId,
      );
      expect(result).toEqual(mockStats);
    });

    it('should throw NotFoundException when contact not found', async () => {
      const contactId = '507f1f77bcf86cd799439013';
      mockContactsService.getContactStats.mockRejectedValue(
        new NotFoundException('Contact not found'),
      );

      await expect(
        controller.getContactStats(contactId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
