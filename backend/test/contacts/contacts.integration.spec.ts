import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import { ContactsModule } from '../../src/contacts/contacts.module';
import { ContactsService } from '../../src/contacts/contacts.service';
import { CreateContactDto } from '../../src/contacts/dto/create-contact.dto';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../src/auth/guards/permission.guard';
import {
  Contact,
  ContactSchema,
} from '../../src/database/schemas/contact.schema';
import {
  Message,
  MessageSchema,
} from '../../src/database/schemas/message.schema';
import { User, UserSchema } from '../../src/database/schemas/user.schema';
import { getModelToken } from '@nestjs/mongoose';

describe('Contacts Integration Tests', () => {
  let app: INestApplication;
  let contactsService: ContactsService;
  let contactModel: any;
  let messageModel: any;
  let userModel: any;

  const mockUser = {
    userId: '507f1f77bcf86cd799439011',
    tenantId: '507f1f77bcf86cd799439012',
    email: 'test@example.com',
    userGroup: {
      groupType: 'admin',
      customPermissions: {
        canSendMessages: true,
        canViewLogs: true,
      },
    },
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

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        MongooseModule.forRoot(
          process.env.MONGODB_URI || 'mongodb://localhost:27017/test',
        ),
        MongooseModule.forFeature([
          { name: Contact.name, schema: ContactSchema },
          { name: Message.name, schema: MessageSchema },
          { name: User.name, schema: UserSchema },
        ]),
        ContactsModule,
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .overrideGuard(PermissionGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    contactsService = moduleFixture.get<ContactsService>(ContactsService);
    contactModel = moduleFixture.get(getModelToken(Contact.name));
    messageModel = moduleFixture.get(getModelToken(Message.name));
    userModel = moduleFixture.get(getModelToken(User.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await contactModel.deleteMany({});
    await messageModel.deleteMany({});
    await userModel.deleteMany({});

    // Create a mock user for population with a unique ID
    const uniqueUserId = new Types.ObjectId();
    await userModel.create({
      _id: uniqueUserId,
      email: mockUser.email,
      password: 'hashedpassword',
      firstName: 'Test',
      lastName: 'User',
      tenantId: new Types.ObjectId(mockUser.tenantId),
      userGroupId: new Types.ObjectId('507f1f77bcf86cd799439013'),
    });

    // Update mockUser with the unique ID
    mockUser.userId = uniqueUserId.toString();
  });

  describe('Contact CRUD Operations', () => {
    it('should create a new contact successfully', async () => {
      const result = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      expect(result).toBeDefined();
      expect(result.phoneNumber).toBe(mockCreateContactDto.phoneNumber);
      expect(result.firstName).toBe(mockCreateContactDto.firstName);
      expect(result.lastName).toBe(mockCreateContactDto.lastName);
      expect(result.fullName).toBe('John Doe');
      expect(result.tenantId).toBe(mockUser.tenantId);
      expect(result.createdBy).toBe(mockUser.userId);
    });

    it('should prevent duplicate phone numbers in the same tenant', async () => {
      // Create first contact
      await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      // Try to create second contact with same phone number
      await expect(
        contactsService.createContact(
          mockCreateContactDto,
          mockUser.tenantId,
          mockUser.userId,
        ),
      ).rejects.toThrow('Contact with this phone number already exists');
    });

    it('should allow same phone number in different tenants', async () => {
      const tenant1 = '507f1f77bcf86cd799439012';
      const tenant2 = '507f1f77bcf86cd799439013';

      // Create contact in tenant 1
      const contact1 = await contactsService.createContact(
        mockCreateContactDto,
        tenant1,
        mockUser.userId,
      );

      // Create contact with same phone number in tenant 2
      const contact2 = await contactsService.createContact(
        mockCreateContactDto,
        tenant2,
        mockUser.userId,
      );

      expect(contact1.tenantId).toBe(tenant1);
      expect(contact2.tenantId).toBe(tenant2);
      expect(contact1.phoneNumber).toBe(contact2.phoneNumber);
    });

    it('should find all contacts for a tenant', async () => {
      // Create multiple contacts
      await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const contact2 = {
        ...mockCreateContactDto,
        phoneNumber: '+0987654321',
        firstName: 'Jane',
        lastName: 'Smith',
      };
      await contactsService.createContact(
        contact2,
        mockUser.tenantId,
        mockUser.userId,
      );

      const contacts = await contactsService.findAllContacts(mockUser.tenantId);

      expect(contacts).toHaveLength(2);
      expect(contacts[0].phoneNumber).toBe(mockCreateContactDto.phoneNumber);
      expect(contacts[1].phoneNumber).toBe(contact2.phoneNumber);
    });

    it('should find contact by ID', async () => {
      const createdContact = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const foundContact = await contactsService.findContactById(
        createdContact.id,
        mockUser.tenantId,
      );

      expect(foundContact).toBeDefined();
      expect(foundContact.id).toBe(createdContact.id);
      expect(foundContact.phoneNumber).toBe(mockCreateContactDto.phoneNumber);
    });

    it('should update contact successfully', async () => {
      const createdContact = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const updateDto = {
        firstName: 'Jane',
        company: 'Updated Corp',
      };

      const updatedContact = await contactsService.updateContact(
        createdContact.id,
        updateDto,
        mockUser.tenantId,
      );

      expect(updatedContact.firstName).toBe('Jane');
      expect(updatedContact.company).toBe('Updated Corp');
      expect(updatedContact.lastName).toBe(mockCreateContactDto.lastName); // Unchanged
      expect(updatedContact.fullName).toBe('Jane Doe');
    });

    it('should soft delete contact', async () => {
      const createdContact = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const deleteResult = await contactsService.deleteContact(
        createdContact.id,
        mockUser.tenantId,
      );

      expect(deleteResult.message).toBe('Contact deleted successfully');

      // Contact should not be found after deletion
      await expect(
        contactsService.findContactById(createdContact.id, mockUser.tenantId),
      ).rejects.toThrow('Contact not found');
    });
  });

  describe('Contact Statistics', () => {
    it('should return contact statistics with message history', async () => {
      const createdContact = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      // Add some mock messages
      await messageModel.create([
        {
          phoneNumber: mockCreateContactDto.phoneNumber,
          content: 'Hello John',
          messageType: 'text',
          status: 'sent',
          timestamp: new Date(),
          tenantId: new Types.ObjectId(mockUser.tenantId),
          sentBy: new Types.ObjectId(mockUser.userId),
          deviceId: new Types.ObjectId('507f1f77bcf86cd799439014'),
        },
        {
          phoneNumber: mockCreateContactDto.phoneNumber,
          content: 'Hi there',
          messageType: 'text',
          status: 'sent',
          timestamp: new Date(),
          tenantId: new Types.ObjectId(mockUser.tenantId),
          sentBy: new Types.ObjectId(mockUser.userId),
          deviceId: new Types.ObjectId('507f1f77bcf86cd799439014'),
        },
      ]);

      const stats = await contactsService.getContactStats(
        createdContact.id,
        mockUser.tenantId,
      );

      expect(stats).toBeDefined();
      expect(stats.totalMessages).toBe(2);
      expect(stats.sentMessages).toBe(2);
      expect(stats.receivedMessages).toBe(0);
      expect(stats.messageHistory).toHaveLength(2);
      expect(stats.messageHistory.map((m) => m.content)).toContain(
        'Hello John',
      );
      expect(stats.messageHistory.map((m) => m.content)).toContain('Hi there');
    });

    it('should return empty statistics for contact with no messages', async () => {
      const createdContact = await contactsService.createContact(
        mockCreateContactDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const stats = await contactsService.getContactStats(
        createdContact.id,
        mockUser.tenantId,
      );

      expect(stats.totalMessages).toBe(0);
      expect(stats.sentMessages).toBe(0);
      expect(stats.receivedMessages).toBe(0);
      expect(stats.messageHistory).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundException for non-existent contact', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        contactsService.findContactById(fakeId, mockUser.tenantId),
      ).rejects.toThrow('Contact not found');
    });

    it('should throw NotFoundException when updating non-existent contact', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        contactsService.updateContact(
          fakeId,
          { firstName: 'Jane' },
          mockUser.tenantId,
        ),
      ).rejects.toThrow('Contact not found');
    });

    it('should throw NotFoundException when deleting non-existent contact', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        contactsService.deleteContact(fakeId, mockUser.tenantId),
      ).rejects.toThrow('Contact not found');
    });
  });
});
