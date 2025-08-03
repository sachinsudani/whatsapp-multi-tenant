import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../database/schemas/message.schema';
import { WhatsAppSession } from '../database/schemas/whatsapp-session.schema';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessageLogResponseDto } from './dto/message-log-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
    @InjectModel(WhatsAppSession.name)
    private whatsappSessionModel: Model<WhatsAppSession>,
  ) {}

  async findAllMessages(
    queryMessagesDto: QueryMessagesDto,
    tenantId: string,
  ): Promise<{
    messages: MessageLogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 10,
      deviceId,
      phoneNumber,
      messageType,
      status,
      broadcast,
      startDate,
      endDate,
      sortBy = 'sentAt',
      sortOrder = 'desc',
    } = queryMessagesDto;

    // Build query
    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    // Add filters
    if (deviceId) {
      query.deviceId = new Types.ObjectId(deviceId);
    }

    if (phoneNumber) {
      query.phoneNumber = { $regex: phoneNumber, $options: 'i' };
    }

    if (messageType) {
      query.messageType = messageType;
    }

    if (status) {
      query.status = status;
    }

    if (broadcast !== undefined) {
      query.broadcast = broadcast;
    }

    // Date range filter
    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) {
        query.sentAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sentAt.$lte = new Date(endDate);
      }
    }

    // Build sort object
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query with pagination
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(query)
        .populate('deviceId', 'deviceName')
        .populate('sentBy', 'firstName lastName email')
        .populate('groupId', 'name')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(query).exec(),
    ]);

    return {
      messages: messages.map((message) =>
        this.mapToMessageLogResponse(message),
      ),
      total,
      page,
      limit,
    };
  }

  async findMessageById(
    messageId: string,
    tenantId: string,
  ): Promise<MessageLogResponseDto> {
    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(messageId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('deviceId', 'deviceName')
      .populate('sentBy', 'firstName lastName email')
      .populate('groupId', 'name')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.mapToMessageLogResponse(message);
  }

  async getMessageStats(
    tenantId: string,
    startDate?: string,
    endDate?: string,
  ): Promise<{
    totalMessages: number;
    sentMessages: number;
    deliveredMessages: number;
    readMessages: number;
    failedMessages: number;
    messagesByType: Record<string, number>;
    messagesByStatus: Record<string, number>;
    messagesByDevice: Array<{
      deviceId: string;
      deviceName: string;
      count: number;
    }>;
  }> {
    const query: Record<string, any> = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    // Date range filter
    if (startDate || endDate) {
      query.sentAt = {};
      if (startDate) {
        query.sentAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.sentAt.$lte = new Date(endDate);
      }
    }

    // Get total messages
    const totalMessages = await this.messageModel.countDocuments(query).exec();

    // Get messages by status
    const statusStats = await this.messageModel.aggregate([
      { $match: query },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    // Get messages by type
    const typeStats = await this.messageModel.aggregate([
      { $match: query },
      { $group: { _id: '$messageType', count: { $sum: 1 } } },
    ]);

    // Get messages by device
    const deviceStats = await this.messageModel.aggregate([
      { $match: query },
      { $group: { _id: '$deviceId', count: { $sum: 1 } } },
      {
        $lookup: {
          from: 'whatsappsessions',
          localField: '_id',
          foreignField: '_id',
          as: 'device',
        },
      },
      { $unwind: '$device' },
      {
        $project: {
          deviceId: '$_id',
          deviceName: '$device.deviceName',
          count: 1,
        },
      },
    ]);

    // Convert to record format
    const messagesByStatus: Record<string, number> = {};
    statusStats.forEach((stat) => {
      messagesByStatus[stat._id] = stat.count;
    });

    const messagesByType: Record<string, number> = {};
    typeStats.forEach((stat) => {
      messagesByType[stat._id] = stat.count;
    });

    return {
      totalMessages,
      sentMessages: messagesByStatus['sent'] || 0,
      deliveredMessages: messagesByStatus['delivered'] || 0,
      readMessages: messagesByStatus['read'] || 0,
      failedMessages: messagesByStatus['failed'] || 0,
      messagesByType,
      messagesByStatus,
      messagesByDevice: deviceStats.map((stat) => ({
        deviceId: stat.deviceId.toString(),
        deviceName: stat.deviceName,
        count: stat.count,
      })),
    };
  }

  async updateMessageStatus(
    messageId: string,
    status: string,
    tenantId: string,
  ): Promise<MessageLogResponseDto> {
    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(messageId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    const updateData: any = { status };

    // Add timestamp based on status
    switch (status) {
      case 'delivered':
        updateData.deliveredAt = new Date();
        break;
      case 'read':
        updateData.readAt = new Date();
        break;
    }

    const updatedMessage = await this.messageModel
      .findByIdAndUpdate(messageId, updateData, { new: true })
      .populate('deviceId', 'deviceName')
      .populate('sentBy', 'firstName lastName email')
      .populate('groupId', 'name')
      .exec();

    return this.mapToMessageLogResponse(updatedMessage);
  }

  async deleteMessage(
    messageId: string,
    tenantId: string,
  ): Promise<{ message: string }> {
    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(messageId),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Soft delete message
    await this.messageModel
      .findByIdAndUpdate(messageId, { isDeleted: true })
      .exec();

    return { message: 'Message deleted successfully' };
  }

  private mapToMessageLogResponse(message: any): MessageLogResponseDto {
    return {
      id: message._id.toString(),
      deviceId: message.deviceId._id.toString(),
      deviceName: message.deviceId.deviceName,
      phoneNumber: message.phoneNumber,
      messageType: message.messageType,
      content: message.content,
      caption: message.caption,
      groupId: message.groupId?._id?.toString(),
      groupName: message.groupId?.name,
      replyToMessageId: message.replyToMessageId?.toString(),
      mentionedPhoneNumbers: message.mentionedPhoneNumbers,
      broadcast: message.broadcast,
      status: message.status,
      whatsappMessageId: message.whatsappMessageId,
      errorMessage: message.errorMessage,
      tenantId: message.tenantId.toString(),
      sentBy: {
        id: message.sentBy._id.toString(),
        name: `${message.sentBy.firstName} ${message.sentBy.lastName}`,
        email: message.sentBy.email,
      },
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
