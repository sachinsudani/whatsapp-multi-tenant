import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ChatGroup } from '../database/schemas/chat-group.schema';
import { Message } from '../database/schemas/message.schema';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(ChatGroup.name) private chatGroupModel: Model<ChatGroup>,
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async createGroup(
    createGroupDto: CreateGroupDto,
    tenantId: string,
    userId: string,
  ): Promise<GroupResponseDto> {
    // Check if group already exists in the tenant
    const existingGroup = await this.chatGroupModel
      .findOne({
        groupId: createGroupDto.groupId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (existingGroup) {
      throw new BadRequestException(
        'Group with this WhatsApp group ID already exists',
      );
    }

    // Create new group
    const newGroup = new this.chatGroupModel({
      ...createGroupDto,
      tenantId: new Types.ObjectId(tenantId),
      createdBy: new Types.ObjectId(userId),
      isDeleted: false,
    });

    const savedGroup = await newGroup.save();

    return this.mapToGroupResponse(savedGroup);
  }

  async findAllGroups(tenantId: string): Promise<GroupResponseDto[]> {
    const groups = await this.chatGroupModel
      .find({
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return groups.map((group) => this.mapToGroupResponse(group));
  }

  async findGroupById(
    groupId: string,
    tenantId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('createdBy', 'firstName lastName email')
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    return this.mapToGroupResponse(group);
  }

  async updateGroup(
    groupId: string,
    updateGroupDto: Partial<CreateGroupDto>,
    tenantId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // If updating groupId, check for duplicates
    if (updateGroupDto.groupId && updateGroupDto.groupId !== group.groupId) {
      const existingGroup = await this.chatGroupModel
        .findOne({
          groupId: updateGroupDto.groupId,
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
          _id: { $ne: new Types.ObjectId(groupId) },
        })
        .exec();

      if (existingGroup) {
        throw new BadRequestException(
          'Group with this WhatsApp group ID already exists',
        );
      }
    }

    // Update group
    const updatedGroup = await this.chatGroupModel
      .findByIdAndUpdate(
        groupId,
        { ...updateGroupDto },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToGroupResponse(updatedGroup);
  }

  async deleteGroup(
    groupId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Soft delete
    await this.chatGroupModel
      .findByIdAndUpdate(groupId, { isDeleted: true })
      .exec();

    return { message: 'Group deleted successfully' };
  }

  async getGroupStats(
    groupId: string,
    tenantId: Types.ObjectId,
  ): Promise<{
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    lastMessageAt?: Date;
    messageHistory: Array<{
      id: Types.ObjectId;
      content: string;
      messageType: string;
      status: string;
      sentAt: Date;
      direction: 'sent' | 'received';
    }>;
  }> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    // Get message statistics for this group
    const messages = await this.messageModel
      .find({
        phoneNumber: group.groupId,
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .sort({ timestamp: -1 })
      .limit(50) // Limit to last 50 messages for history
      .exec();

    const sentMessages = messages.filter((msg) => msg.status !== 'failed');
    const receivedMessages = 0; // Incoming messages would be tracked separately

    return {
      totalMessages: messages.length,
      sentMessages: sentMessages.length,
      receivedMessages: receivedMessages,
      lastMessageAt: messages.length > 0 ? messages[0].timestamp : undefined,
      messageHistory: messages.map((msg) => ({
        id: msg._id || new Types.ObjectId(),
        content: msg.content,
        messageType: msg.type || msg.messageType,
        status: msg.status,
        sentAt: msg.timestamp || msg.sentAt,
        direction: 'sent' as const,
      })),
    };
  }

  async addParticipant(
    groupId: string,
    phoneNumber: string,
    tenantId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (group.participants.includes(phoneNumber)) {
      throw new BadRequestException('Participant already exists in group');
    }

    const updatedGroup = await this.chatGroupModel
      .findByIdAndUpdate(
        groupId,
        { $push: { participants: phoneNumber } },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToGroupResponse(updatedGroup);
  }

  async removeParticipant(
    groupId: string,
    phoneNumber: string,
    tenantId: string,
  ): Promise<GroupResponseDto> {
    const group = await this.chatGroupModel
      .findOne({
        _id: new Types.ObjectId(groupId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!group) {
      throw new NotFoundException('Group not found');
    }

    if (!group.participants.includes(phoneNumber)) {
      throw new BadRequestException('Participant not found in group');
    }

    const updatedGroup = await this.chatGroupModel
      .findByIdAndUpdate(
        groupId,
        { $pull: { participants: phoneNumber } },
        { new: true, runValidators: true },
      )
      .populate('createdBy', 'firstName lastName email')
      .exec();

    return this.mapToGroupResponse(updatedGroup);
  }

  private mapToGroupResponse(group: any): GroupResponseDto {
    return {
      id: group._id.toString(),
      groupId: group.groupId,
      name: group.name,
      description: group.description,
      inviteCode: group.inviteCode,
      inviteLink: group.inviteLink,
      isAnnouncement: group.isAnnouncement || false,
      isCommunity: group.isCommunity || false,
      participants: group.participants || [],
      participantCount: group.participants?.length || 0,
      profilePictureUrl: group.profilePictureUrl,
      tenantId: group.tenantId.toString(),
      createdBy: group.createdBy
        ? {
            id: group.createdBy._id.toString(),
            firstName: group.createdBy.firstName,
            lastName: group.createdBy.lastName,
            email: group.createdBy.email,
          }
        : {
            id: '',
            firstName: '',
            lastName: '',
            email: '',
          },
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
      isDeleted: group.isDeleted || false,
    };
  }
}
