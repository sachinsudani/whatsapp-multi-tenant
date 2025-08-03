import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { Types } from 'mongoose';
import { GroupsModule } from '../../src/groups/groups.module';
import { GroupsService } from '../../src/groups/groups.service';
import { CreateGroupDto } from '../../src/groups/dto/create-group.dto';
import { JwtAuthGuard } from '../../src/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../src/auth/guards/permission.guard';
import {
  ChatGroup,
  ChatGroupSchema,
} from '../../src/database/schemas/chat-group.schema';
import {
  Message,
  MessageSchema,
} from '../../src/database/schemas/message.schema';
import { User, UserSchema } from '../../src/database/schemas/user.schema';
import { getModelToken } from '@nestjs/mongoose';

describe('Groups Integration Tests', () => {
  let app: INestApplication;
  let groupsService: GroupsService;
  let chatGroupModel: any;
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

  const mockCreateGroupDto: CreateGroupDto = {
    groupId: '120363025123456789',
    name: 'Project Team Alpha',
    description: 'Team chat for Project Alpha development',
    inviteCode: 'ABC123',
    inviteLink: 'https://chat.whatsapp.com/ABC123',
    isAnnouncement: false,
    isCommunity: false,
    participants: ['+1234567890', '+0987654321'],
    profilePictureUrl: 'https://example.com/group-pic.jpg',
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
          { name: ChatGroup.name, schema: ChatGroupSchema },
          { name: Message.name, schema: MessageSchema },
          { name: User.name, schema: UserSchema },
        ]),
        GroupsModule,
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

    groupsService = moduleFixture.get<GroupsService>(GroupsService);
    chatGroupModel = moduleFixture.get(getModelToken(ChatGroup.name));
    messageModel = moduleFixture.get(getModelToken(Message.name));
    userModel = moduleFixture.get(getModelToken(User.name));
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clear the database before each test
    await chatGroupModel.deleteMany({});
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

  describe('Group CRUD Operations', () => {
    it('should create a new group successfully', async () => {
      const result = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      expect(result).toBeDefined();
      expect(result.groupId).toBe(mockCreateGroupDto.groupId);
      expect(result.name).toBe(mockCreateGroupDto.name);
      expect(result.description).toBe(mockCreateGroupDto.description);
      expect(result.participants).toEqual(mockCreateGroupDto.participants);
      expect(result.participantCount).toBe(2);
      expect(result.tenantId).toBe(mockUser.tenantId);
      expect(result.createdBy.id).toBe(mockUser.userId);
    });

    it('should prevent duplicate group IDs in the same tenant', async () => {
      // Create first group
      await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      // Try to create second group with same groupId
      await expect(
        groupsService.createGroup(
          mockCreateGroupDto,
          mockUser.tenantId,
          mockUser.userId,
        ),
      ).rejects.toThrow('Group with this WhatsApp group ID already exists');
    });

    it('should allow same group ID in different tenants', async () => {
      const tenant1 = '507f1f77bcf86cd799439012';
      const tenant2 = '507f1f77bcf86cd799439013';

      // Create group in tenant 1
      const group1 = await groupsService.createGroup(
        mockCreateGroupDto,
        tenant1,
        mockUser.userId,
      );

      // Create group with same groupId in tenant 2
      const group2 = await groupsService.createGroup(
        mockCreateGroupDto,
        tenant2,
        mockUser.userId,
      );

      expect(group1.tenantId).toBe(tenant1);
      expect(group2.tenantId).toBe(tenant2);
      expect(group1.groupId).toBe(group2.groupId);
    });

    it('should find all groups for a tenant', async () => {
      // Create multiple groups
      await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const group2 = {
        ...mockCreateGroupDto,
        groupId: '120363025123456790',
        name: 'Project Team Beta',
      };
      await groupsService.createGroup(
        group2,
        mockUser.tenantId,
        mockUser.userId,
      );

      const groups = await groupsService.findAllGroups(mockUser.tenantId);

      expect(groups).toHaveLength(2);
      expect(groups[0].groupId).toBe(mockCreateGroupDto.groupId);
      expect(groups[1].groupId).toBe(group2.groupId);
    });

    it('should find group by ID', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const foundGroup = await groupsService.findGroupById(
        createdGroup.id,
        mockUser.tenantId,
      );

      expect(foundGroup).toBeDefined();
      expect(foundGroup.id).toBe(createdGroup.id);
      expect(foundGroup.groupId).toBe(mockCreateGroupDto.groupId);
    });

    it('should update group successfully', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const updateDto = {
        name: 'Updated Team Name',
        description: 'Updated description',
      };

      const updatedGroup = await groupsService.updateGroup(
        createdGroup.id,
        updateDto,
        mockUser.tenantId,
      );

      expect(updatedGroup.name).toBe('Updated Team Name');
      expect(updatedGroup.description).toBe('Updated description');
      expect(updatedGroup.groupId).toBe(mockCreateGroupDto.groupId); // Unchanged
    });

    it('should soft delete group', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const deleteResult = await groupsService.deleteGroup(
        createdGroup.id,
        mockUser.tenantId,
      );

      expect(deleteResult.message).toBe('Group deleted successfully');

      // Group should not be found after deletion
      await expect(
        groupsService.findGroupById(createdGroup.id, mockUser.tenantId),
      ).rejects.toThrow('Group not found');
    });
  });

  describe('Participant Management', () => {
    it('should add participant to group successfully', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const newParticipant = '+9876543210';
      const updatedGroup = await groupsService.addParticipant(
        createdGroup.id,
        newParticipant,
        mockUser.tenantId,
      );

      expect(updatedGroup.participants).toContain(newParticipant);
      expect(updatedGroup.participantCount).toBe(3);
    });

    it('should prevent adding duplicate participant', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const existingParticipant = '+1234567890';

      await expect(
        groupsService.addParticipant(
          createdGroup.id,
          existingParticipant,
          mockUser.tenantId,
        ),
      ).rejects.toThrow('Participant already exists in group');
    });

    it('should remove participant from group successfully', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const participantToRemove = '+1234567890';
      const updatedGroup = await groupsService.removeParticipant(
        createdGroup.id,
        participantToRemove,
        mockUser.tenantId,
      );

      expect(updatedGroup.participants).not.toContain(participantToRemove);
      expect(updatedGroup.participantCount).toBe(1);
    });

    it('should prevent removing non-existent participant', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const nonExistentParticipant = '+9999999999';

      await expect(
        groupsService.removeParticipant(
          createdGroup.id,
          nonExistentParticipant,
          mockUser.tenantId,
        ),
      ).rejects.toThrow('Participant not found in group');
    });
  });

  describe('Group Statistics', () => {
    it('should return group statistics with message history', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      // Add some mock messages with different timestamps
      const now = new Date();
      await messageModel.create([
        {
          phoneNumber: mockCreateGroupDto.groupId,
          content: 'Hello team',
          messageType: 'text',
          status: 'sent',
          timestamp: new Date(now.getTime() + 1000), // 1 second later
          tenantId: new Types.ObjectId(mockUser.tenantId),
          sentBy: new Types.ObjectId(mockUser.userId),
          deviceId: new Types.ObjectId('507f1f77bcf86cd799439014'),
        },
        {
          phoneNumber: mockCreateGroupDto.groupId,
          content: 'Meeting reminder',
          messageType: 'text',
          status: 'sent',
          timestamp: now, // Earlier timestamp
          tenantId: new Types.ObjectId(mockUser.tenantId),
          sentBy: new Types.ObjectId(mockUser.userId),
          deviceId: new Types.ObjectId('507f1f77bcf86cd799439014'),
        },
      ]);

      const stats = await groupsService.getGroupStats(
        createdGroup.id,
        new Types.ObjectId(mockUser.tenantId),
      );

      expect(stats).toBeDefined();
      expect(stats.totalMessages).toBe(2);
      expect(stats.sentMessages).toBe(2);
      expect(stats.receivedMessages).toBe(0);
      expect(stats.messageHistory).toHaveLength(2);
      expect(stats.messageHistory[0].content).toBe('Hello team');
    });

    it('should return empty statistics for group with no messages', async () => {
      const createdGroup = await groupsService.createGroup(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );

      const stats = await groupsService.getGroupStats(
        createdGroup.id,
        new Types.ObjectId(mockUser.tenantId),
      );

      expect(stats.totalMessages).toBe(0);
      expect(stats.sentMessages).toBe(0);
      expect(stats.receivedMessages).toBe(0);
      expect(stats.messageHistory).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should throw NotFoundException for non-existent group', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        groupsService.findGroupById(fakeId, mockUser.tenantId),
      ).rejects.toThrow('Group not found');
    });

    it('should throw NotFoundException when updating non-existent group', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        groupsService.updateGroup(
          fakeId,
          { name: 'Updated' },
          mockUser.tenantId,
        ),
      ).rejects.toThrow('Group not found');
    });

    it('should throw NotFoundException when deleting non-existent group', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        groupsService.deleteGroup(fakeId, mockUser.tenantId),
      ).rejects.toThrow('Group not found');
    });

    it('should throw NotFoundException when getting stats for non-existent group', async () => {
      const fakeId = '507f1f77bcf86cd799439099';

      await expect(
        groupsService.getGroupStats(
          fakeId,
          new Types.ObjectId(mockUser.tenantId),
        ),
      ).rejects.toThrow('Group not found');
    });
  });
});
