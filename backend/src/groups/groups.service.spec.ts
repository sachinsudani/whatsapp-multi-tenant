import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { Types } from 'mongoose';
import { GroupsService } from './groups.service';
import { ChatGroup } from '../database/schemas/chat-group.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('GroupsService', () => {
  let service: GroupsService;

  const mockChatGroupModel = jest.fn().mockImplementation(() => ({
    save: jest.fn(),
  }));
  mockChatGroupModel.findOne = jest.fn();
  mockChatGroupModel.find = jest.fn();
  mockChatGroupModel.findByIdAndUpdate = jest.fn();
  mockChatGroupModel.new = jest.fn();

  const mockMessageModel = {
    find: jest.fn(),
  };

  const mockTenantId = '507f1f77bcf86cd799439012';
  const mockUserId = '507f1f77bcf86cd799439011';
  const mockGroupId = '507f1f77bcf86cd799439013';

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

  const mockGroup = {
    _id: new Types.ObjectId(mockGroupId),
    groupId: '120363025123456789',
    name: 'Project Team Alpha',
    description: 'Team chat for Project Alpha development',
    inviteCode: 'ABC123',
    inviteLink: 'https://chat.whatsapp.com/ABC123',
    isAnnouncement: false,
    isCommunity: false,
    participants: ['+1234567890', '+0987654321'],
    profilePictureUrl: 'https://example.com/group-pic.jpg',
    tenantId: new Types.ObjectId(mockTenantId),
    createdBy: new Types.ObjectId(mockUserId),
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  const mockCreatedBy = {
    _id: new Types.ObjectId(mockUserId),
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupsService,
        {
          provide: getModelToken(ChatGroup.name),
          useValue: mockChatGroupModel,
        },
        {
          provide: getModelToken(Message.name),
          useValue: mockMessageModel,
        },
      ],
    }).compile();

    service = module.get<GroupsService>(GroupsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      // Mock the query chain for findOne
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      // Mock the new instance and save
      const mockNewInstance = {
        ...mockCreateGroupDto,
        tenantId: new Types.ObjectId(mockTenantId),
        createdBy: new Types.ObjectId(mockUserId),
        isDeleted: false,
        save: jest.fn().mockResolvedValue({
          ...mockGroup,
          populate: jest.fn().mockResolvedValue({
            ...mockGroup,
            createdBy: mockCreatedBy,
          }),
        }),
      };
      mockChatGroupModel.mockImplementation(() => mockNewInstance);

      const result = await service.createGroup(
        mockCreateGroupDto,
        mockTenantId,
        mockUserId,
      );

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        groupId: mockCreateGroupDto.groupId,
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(result).toBeDefined();
      expect(result.groupId).toBe(mockCreateGroupDto.groupId);
    });

    it('should throw BadRequestException when group already exists', async () => {
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.createGroup(mockCreateGroupDto, mockTenantId, mockUserId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllGroups', () => {
    it('should return all groups for tenant', async () => {
      const mockGroups = [
        {
          ...mockGroup,
          createdBy: mockCreatedBy,
        },
      ];
      const mockFindChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockGroups),
        }),
      };
      mockChatGroupModel.find.mockReturnValue(mockFindChain);

      const result = await service.findAllGroups(mockTenantId);

      expect(mockChatGroupModel.find).toHaveBeenCalledWith({
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(result).toHaveLength(1);
      expect(result[0].groupId).toBe(mockGroup.groupId);
    });

    it('should return empty array when no groups exist', async () => {
      const mockFindChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
      };
      mockChatGroupModel.find.mockReturnValue(mockFindChain);

      const result = await service.findAllGroups(mockTenantId);

      expect(result).toEqual([]);
    });
  });

  describe('findGroupById', () => {
    it('should return group by ID', async () => {
      const mockFindOneChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockGroup,
            createdBy: mockCreatedBy,
          }),
        }),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      const result = await service.findGroupById(mockGroupId, mockTenantId);

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(result).toBeDefined();
      expect(result.id).toBe(mockGroupId);
    });

    it('should throw NotFoundException when group not found', async () => {
      const mockFindOneChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.findGroupById(mockGroupId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully', async () => {
      const updateDto = { name: 'Updated Team Name' };
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      const mockFindByIdAndUpdateChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockGroup,
            name: 'Updated Team Name',
            createdBy: mockCreatedBy,
          }),
        }),
      };
      mockChatGroupModel.findByIdAndUpdate.mockReturnValue(
        mockFindByIdAndUpdateChain,
      );

      const result = await service.updateGroup(
        mockGroupId,
        updateDto,
        mockTenantId,
      );

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(result).toBeDefined();
      expect(result.name).toBe('Updated Team Name');
    });

    it('should throw NotFoundException when group not found', async () => {
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.updateGroup(mockGroupId, { name: 'Updated' }, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should check for duplicate groupId when updating', async () => {
      const updateDto = { groupId: '120363025123456790' };
      const mockFindOneChain = {
        exec: jest
          .fn()
          .mockResolvedValueOnce(mockGroup)
          .mockResolvedValueOnce({ _id: 'different-id' }),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.updateGroup(mockGroupId, updateDto, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);
      mockChatGroupModel.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockGroup),
      });

      const result = await service.deleteGroup(mockGroupId, mockTenantId);

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(mockChatGroupModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGroupId,
        { isDeleted: true },
      );
      expect(result.message).toBe('Group deleted successfully');
    });

    it('should throw NotFoundException when group not found', async () => {
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.deleteGroup(mockGroupId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGroupStats', () => {
    it('should return group statistics', async () => {
      const mockMessages = [
        {
          _id: new Types.ObjectId('507f1f77bcf86cd799439014'),
          content: 'Hello team',
          type: 'text',
          status: 'sent',
          timestamp: new Date(),
        },
      ];

      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      const mockMessageFindChain = {
        sort: jest.fn().mockReturnValue({
          limit: jest.fn().mockReturnValue({
            exec: jest.fn().mockResolvedValue(mockMessages),
          }),
        }),
      };
      mockMessageModel.find.mockReturnValue(mockMessageFindChain);

      const result = await service.getGroupStats(mockGroupId, mockTenantId);

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(result).toBeDefined();
      expect(result.totalMessages).toBe(1);
      expect(result.sentMessages).toBe(1);
      expect(result.receivedMessages).toBe(0);
    });

    it('should throw NotFoundException when group not found', async () => {
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(null),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.getGroupStats(mockGroupId, mockTenantId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addParticipant', () => {
    it('should add participant to group successfully', async () => {
      const phoneNumber = '+9876543210';
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      const mockFindByIdAndUpdateChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockGroup,
            participants: [...mockGroup.participants, phoneNumber],
            createdBy: mockCreatedBy,
          }),
        }),
      };
      mockChatGroupModel.findByIdAndUpdate.mockReturnValue(
        mockFindByIdAndUpdateChain,
      );

      const result = await service.addParticipant(
        mockGroupId,
        phoneNumber,
        mockTenantId,
      );

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(mockChatGroupModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGroupId,
        { $push: { participants: phoneNumber } },
        { new: true, runValidators: true },
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when participant already exists', async () => {
      const phoneNumber = '+1234567890';
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.addParticipant(mockGroupId, phoneNumber, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from group successfully', async () => {
      const phoneNumber = '+1234567890';
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      const mockFindByIdAndUpdateChain = {
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue({
            ...mockGroup,
            participants: ['+0987654321'],
            createdBy: mockCreatedBy,
          }),
        }),
      };
      mockChatGroupModel.findByIdAndUpdate.mockReturnValue(
        mockFindByIdAndUpdateChain,
      );

      const result = await service.removeParticipant(
        mockGroupId,
        phoneNumber,
        mockTenantId,
      );

      expect(mockChatGroupModel.findOne).toHaveBeenCalledWith({
        _id: new Types.ObjectId(mockGroupId),
        tenantId: new Types.ObjectId(mockTenantId),
        isDeleted: false,
      });
      expect(mockChatGroupModel.findByIdAndUpdate).toHaveBeenCalledWith(
        mockGroupId,
        { $pull: { participants: phoneNumber } },
        { new: true, runValidators: true },
      );
      expect(result).toBeDefined();
    });

    it('should throw BadRequestException when participant not found', async () => {
      const phoneNumber = '+9999999999';
      const mockFindOneChain = {
        exec: jest.fn().mockResolvedValue(mockGroup),
      };
      mockChatGroupModel.findOne.mockReturnValue(mockFindOneChain);

      await expect(
        service.removeParticipant(mockGroupId, phoneNumber, mockTenantId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
