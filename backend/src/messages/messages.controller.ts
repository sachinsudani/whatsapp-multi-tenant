import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { MessageLogResponseDto } from './dto/message-log-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all messages with pagination and filters' })
  @ApiResponse({
    status: 200,
    description: 'Messages retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        messages: {
          type: 'array',
          items: { $ref: '#/components/schemas/MessageLogResponseDto' },
        },
        total: { type: 'number' },
        page: { type: 'number' },
        limit: { type: 'number' },
      },
    },
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'deviceId', required: false, type: String })
  @ApiQuery({ name: 'phoneNumber', required: false, type: String })
  @ApiQuery({
    name: 'messageType',
    required: false,
    enum: [
      'text',
      'image',
      'video',
      'audio',
      'document',
      'location',
      'contact',
    ],
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
  })
  @ApiQuery({ name: 'broadcast', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['sentAt', 'deliveredAt', 'readAt', 'phoneNumber', 'status'],
  })
  @ApiQuery({ name: 'sortOrder', required: false, enum: ['asc', 'desc'] })
  async findAllMessages(
    @Query() queryMessagesDto: QueryMessagesDto,
    @Request() req: Request & { user: any },
  ): Promise<{
    messages: MessageLogResponseDto[];
    total: number;
    page: number;
    limit: number;
  }> {
    return this.messagesService.findAllMessages(
      queryMessagesDto,
      req.user.tenantId,
    );
  }

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get message statistics and analytics' })
  @ApiResponse({
    status: 200,
    description: 'Message statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalMessages: { type: 'number' },
        sentMessages: { type: 'number' },
        deliveredMessages: { type: 'number' },
        readMessages: { type: 'number' },
        failedMessages: { type: 'number' },
        messagesByType: { type: 'object' },
        messagesByStatus: { type: 'object' },
        messagesByDevice: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              deviceId: { type: 'string' },
              deviceName: { type: 'string' },
              count: { type: 'number' },
            },
          },
        },
      },
    },
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getMessageStats(
    @Request() req: Request & { user: any },
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
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
    return this.messagesService.getMessageStats(
      req.user.tenantId,
      startDate,
      endDate,
    );
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get message by ID' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message retrieved successfully',
    type: MessageLogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  async findMessageById(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<MessageLogResponseDto> {
    return this.messagesService.findMessageById(id, req.user.tenantId);
  }

  @Put(':id/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update message status' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message status updated successfully',
    type: MessageLogResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  async updateMessageStatus(
    @Param('id') id: string,
    @Query('status') status: string,
    @Request() req: Request & { user: any },
  ): Promise<MessageLogResponseDto> {
    return this.messagesService.updateMessageStatus(
      id,
      status,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete message by ID (soft delete)' })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: 200,
    description: 'Message deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Message not found',
  })
  async deleteMessage(
    @Param('id') id: string,
    @Request() req: Request & { user: any },
  ): Promise<{ message: string }> {
    return this.messagesService.deleteMessage(id, req.user.tenantId);
  }
}
