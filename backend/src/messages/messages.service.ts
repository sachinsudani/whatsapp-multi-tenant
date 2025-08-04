import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message } from '../database/schemas/message.schema';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessageLogResponseDto } from './dto/message-log-response.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<Message>,
  ) {}

  async findAll(query: QueryMessagesDto, tenantId: string): Promise<{
    messages: MessageLogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    const { page = 1, limit = 10, search, deviceId, status } = query;
    const skip = (page - 1) * limit;

    // Build filter with tenantId
    const filter: any = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
    };

    if (search) {
      filter.$or = [
        { phoneNumber: { $regex: search, $options: 'i' } },
        { content: { $regex: search, $options: 'i' } },
      ];
    }

    if (deviceId) {
      filter.deviceId = new Types.ObjectId(deviceId);
    }

    if (status) {
      filter.status = status;
    }

    const [messages, total] = await Promise.all([
      this.messageModel
        .find(filter)
        .populate('deviceId', 'deviceName')
        .populate('sentBy', 'firstName lastName email')
        .sort({ sentAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments(filter),
    ]);

    return {
      messages: messages.map((message) => this.mapToMessageLogResponse(message)),
      total,
      page,
      limit,
    };
  }

  async findOne(id: string, tenantId: string): Promise<MessageLogResponseDto> {
    const message = await this.messageModel
      .findOne({
        _id: new Types.ObjectId(id),
        tenantId: new Types.ObjectId(tenantId),
        isDeleted: false,
      })
      .populate('deviceId', 'deviceName')
      .populate('sentBy', 'firstName lastName email')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.mapToMessageLogResponse(message);
  }

  async getMessageStats(tenantId: string, period: string = '24h'): Promise<any> {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const filter = {
      tenantId: new Types.ObjectId(tenantId),
      isDeleted: false,
      sentAt: { $gte: startDate },
    };

    const [totalMessages, sentMessages, deliveredMessages, readMessages, failedMessages] =
      await Promise.all([
        this.messageModel.countDocuments(filter),
        this.messageModel.countDocuments({ ...filter, status: 'sent' }),
        this.messageModel.countDocuments({ ...filter, status: 'delivered' }),
        this.messageModel.countDocuments({ ...filter, status: 'read' }),
        this.messageModel.countDocuments({ ...filter, status: 'failed' }),
      ]);

    return {
      total: totalMessages,
      sent: sentMessages,
      delivered: deliveredMessages,
      read: readMessages,
      failed: failedMessages,
      period,
    };
  }

  async updateMessageStatus(
    id: string,
    status: string,
    tenantId: string,
  ): Promise<MessageLogResponseDto> {
    const message = await this.messageModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        {
          status,
          ...(status === 'delivered' && { deliveredAt: new Date() }),
          ...(status === 'read' && { readAt: new Date() }),
          updatedAt: new Date(),
        },
        { new: true }
      )
      .populate('deviceId', 'deviceName')
      .populate('sentBy', 'firstName lastName email')
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return this.mapToMessageLogResponse(message);
  }

  async remove(id: string, tenantId: string): Promise<{ message: string }> {
    const message = await this.messageModel
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(id),
          tenantId: new Types.ObjectId(tenantId),
          isDeleted: false,
        },
        { isDeleted: true, updatedAt: new Date() },
        { new: true }
      )
      .exec();

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return { message: 'Message deleted successfully' };
  }

  private mapToMessageLogResponse(message: any): MessageLogResponseDto {
    return {
      id: message._id.toString(),
      deviceId: message.deviceId?._id?.toString() || '',
      deviceName: message.deviceId?.deviceName || '',
      phoneNumber: message.phoneNumber,
      messageType: message.messageType,
      content: message.content,
      caption: message.caption,
      groupId: message.groupId?.toString(),
      replyToMessageId: message.replyToMessageId?.toString(),
      mentionedPhoneNumbers: message.mentionedPhoneNumbers,
      broadcast: message.broadcast,
      status: message.status,
      whatsappMessageId: message.whatsappMessageId,
      errorMessage: message.errorMessage,
      tenantId: message.tenantId.toString(),
      sentBy: message.sentBy?._id?.toString() || '',
      sentByName: message.sentBy
        ? `${message.sentBy.firstName} ${message.sentBy.lastName}`
        : '',
      sentAt: message.sentAt,
      deliveredAt: message.deliveredAt,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  }
}
