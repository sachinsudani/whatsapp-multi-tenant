import { Test, TestingModule } from '@nestjs/testing';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('GroupsController', () => {
  let controller: GroupsController;
  let service: GroupsService;

  const mockGroupsService = {
    createGroup: jest.fn(),
    findAllGroups: jest.fn(),
    findGroupById: jest.fn(),
    updateGroup: jest.fn(),
    deleteGroup: jest.fn(),
    getGroupStats: jest.fn(),
    addParticipant: jest.fn(),
    removeParticipant: jest.fn(),
  };

  const mockUser = {
    userId: '507f1f77bcf86cd799439011',
    tenantId: '507f1f77bcf86cd799439012',
    email: 'test@example.com',
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

  const mockGroupResponse: GroupResponseDto = {
    id: '507f1f77bcf86cd799439013',
    groupId: '120363025123456789',
    name: 'Project Team Alpha',
    description: 'Team chat for Project Alpha development',
    inviteCode: 'ABC123',
    inviteLink: 'https://chat.whatsapp.com/ABC123',
    isAnnouncement: false,
    isCommunity: false,
    participants: ['+1234567890', '+0987654321'],
    participantCount: 2,
    profilePictureUrl: 'https://example.com/group-pic.jpg',
    tenantId: '507f1f77bcf86cd799439012',
    createdBy: {
      id: '507f1f77bcf86cd799439011',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GroupsController],
      providers: [
        {
          provide: GroupsService,
          useValue: mockGroupsService,
        },
      ],
    }).compile();

    controller = module.get<GroupsController>(GroupsController);
    service = module.get<GroupsService>(GroupsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createGroup', () => {
    it('should create a new group successfully', async () => {
      mockGroupsService.createGroup.mockResolvedValue(mockGroupResponse);

      const result = await controller.createGroup(mockCreateGroupDto, {
        user: mockUser,
      } as any);

      expect(service.createGroup).toHaveBeenCalledWith(
        mockCreateGroupDto,
        mockUser.tenantId,
        mockUser.userId,
      );
      expect(result).toEqual(mockGroupResponse);
    });

    it('should throw BadRequestException when group already exists', async () => {
      mockGroupsService.createGroup.mockRejectedValue(
        new BadRequestException(
          'Group with this WhatsApp group ID already exists',
        ),
      );

      await expect(
        controller.createGroup(mockCreateGroupDto, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAllGroups', () => {
    it('should return all groups for tenant', async () => {
      const mockGroups = [mockGroupResponse];
      mockGroupsService.findAllGroups.mockResolvedValue(mockGroups);

      const result = await controller.findAllGroups({
        user: mockUser,
      } as any);

      expect(service.findAllGroups).toHaveBeenCalledWith(mockUser.tenantId);
      expect(result).toEqual(mockGroups);
    });

    it('should return empty array when no groups exist', async () => {
      mockGroupsService.findAllGroups.mockResolvedValue([]);

      const result = await controller.findAllGroups({
        user: mockUser,
      } as any);

      expect(result).toEqual([]);
    });
  });

  describe('findGroupById', () => {
    it('should return group by ID', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      mockGroupsService.findGroupById.mockResolvedValue(mockGroupResponse);

      const result = await controller.findGroupById(groupId, {
        user: mockUser,
      } as any);

      expect(service.findGroupById).toHaveBeenCalledWith(
        groupId,
        mockUser.tenantId,
      );
      expect(result).toEqual(mockGroupResponse);
    });

    it('should throw NotFoundException when group not found', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      mockGroupsService.findGroupById.mockRejectedValue(
        new NotFoundException('Group not found'),
      );

      await expect(
        controller.findGroupById(groupId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateGroup', () => {
    it('should update group successfully', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const updateDto = { name: 'Updated Team Name' };
      const updatedGroup = { ...mockGroupResponse, name: 'Updated Team Name' };
      mockGroupsService.updateGroup.mockResolvedValue(updatedGroup);

      const result = await controller.updateGroup(groupId, updateDto, {
        user: mockUser,
      } as any);

      expect(service.updateGroup).toHaveBeenCalledWith(
        groupId,
        updateDto,
        mockUser.tenantId,
      );
      expect(result).toEqual(updatedGroup);
    });

    it('should throw NotFoundException when group not found', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const updateDto = { name: 'Updated Team Name' };
      mockGroupsService.updateGroup.mockRejectedValue(
        new NotFoundException('Group not found'),
      );

      await expect(
        controller.updateGroup(groupId, updateDto, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteGroup', () => {
    it('should delete group successfully', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const deleteResponse = { message: 'Group deleted successfully' };
      mockGroupsService.deleteGroup.mockResolvedValue(deleteResponse);

      const result = await controller.deleteGroup(groupId, {
        user: mockUser,
      } as any);

      expect(service.deleteGroup).toHaveBeenCalledWith(
        groupId,
        mockUser.tenantId,
      );
      expect(result).toEqual(deleteResponse);
    });

    it('should throw NotFoundException when group not found', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      mockGroupsService.deleteGroup.mockRejectedValue(
        new NotFoundException('Group not found'),
      );

      await expect(
        controller.deleteGroup(groupId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getGroupStats', () => {
    it('should return group statistics', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const mockStats = {
        totalMessages: 150,
        sentMessages: 100,
        receivedMessages: 50,
        lastMessageAt: new Date(),
        messageHistory: [
          {
            id: '507f1f77bcf86cd799439014',
            content: 'Hello team',
            messageType: 'text',
            status: 'sent',
            sentAt: new Date(),
            direction: 'sent' as const,
          },
        ],
      };
      mockGroupsService.getGroupStats.mockResolvedValue(mockStats);

      const result = await controller.getGroupStats(groupId, {
        user: mockUser,
      } as any);

      expect(service.getGroupStats).toHaveBeenCalledWith(
        groupId,
        mockUser.tenantId,
      );
      expect(result).toEqual(mockStats);
    });

    it('should throw NotFoundException when group not found', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      mockGroupsService.getGroupStats.mockRejectedValue(
        new NotFoundException('Group not found'),
      );

      await expect(
        controller.getGroupStats(groupId, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('addParticipant', () => {
    it('should add participant to group successfully', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const phoneNumber = '+9876543210';
      const updatedGroup = {
        ...mockGroupResponse,
        participants: [...mockGroupResponse.participants, phoneNumber],
        participantCount: 3,
      };
      mockGroupsService.addParticipant.mockResolvedValue(updatedGroup);

      const result = await controller.addParticipant(groupId, { phoneNumber }, {
        user: mockUser,
      } as any);

      expect(service.addParticipant).toHaveBeenCalledWith(
        groupId,
        phoneNumber,
        mockUser.tenantId,
      );
      expect(result).toEqual(updatedGroup);
    });

    it('should throw BadRequestException when participant already exists', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const phoneNumber = '+1234567890';
      mockGroupsService.addParticipant.mockRejectedValue(
        new BadRequestException('Participant already exists in group'),
      );

      await expect(
        controller.addParticipant(groupId, { phoneNumber }, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('removeParticipant', () => {
    it('should remove participant from group successfully', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const phoneNumber = '+1234567890';
      const updatedGroup = {
        ...mockGroupResponse,
        participants: ['+0987654321'],
        participantCount: 1,
      };
      mockGroupsService.removeParticipant.mockResolvedValue(updatedGroup);

      const result = await controller.removeParticipant(groupId, phoneNumber, {
        user: mockUser,
      } as any);

      expect(service.removeParticipant).toHaveBeenCalledWith(
        groupId,
        phoneNumber,
        mockUser.tenantId,
      );
      expect(result).toEqual(updatedGroup);
    });

    it('should throw BadRequestException when participant not found', async () => {
      const groupId = '507f1f77bcf86cd799439013';
      const phoneNumber = '+9999999999';
      mockGroupsService.removeParticipant.mockRejectedValue(
        new BadRequestException('Participant not found in group'),
      );

      await expect(
        controller.removeParticipant(groupId, phoneNumber, {
          user: mockUser,
        } as any),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
