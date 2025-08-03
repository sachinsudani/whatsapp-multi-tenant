import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { GroupResponseDto } from './dto/group-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';
import { Types } from 'mongoose';

@ApiTags('Groups')
@Controller('groups')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  @RequirePermission('canSendMessages')
  @ApiOperation({
    summary: 'Create a new chat group',
    description: 'Create a new WhatsApp chat group for the current tenant',
  })
  @ApiResponse({
    status: 201,
    description: 'Group created successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Group with this WhatsApp group ID already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createGroup(
    @Body() createGroupDto: CreateGroupDto,
    @Request() req: any,
  ): Promise<GroupResponseDto> {
    return this.groupsService.createGroup(
      createGroupDto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get all chat groups',
    description: 'Retrieve all chat groups for the current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Groups retrieved successfully',
    type: [GroupResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAllGroups(@Request() req: any): Promise<GroupResponseDto[]> {
    return this.groupsService.findAllGroups(req.user.tenantId);
  }

  @Get(':id')
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get group by ID',
    description: 'Retrieve a specific chat group by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Group retrieved successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async findGroupById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<GroupResponseDto> {
    return this.groupsService.findGroupById(id, req.user.tenantId);
  }

  @Put(':id')
  @RequirePermission('canSendMessages')
  @ApiOperation({
    summary: 'Update group',
    description: 'Update an existing chat group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Group updated successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async updateGroup(
    @Param('id') id: string,
    @Body() updateGroupDto: Partial<CreateGroupDto>,
    @Request() req: any,
  ): Promise<GroupResponseDto> {
    return this.groupsService.updateGroup(
      id,
      updateGroupDto,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @RequirePermission('canSendMessages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete group',
    description:
      'Soft delete a chat group (marks as deleted but keeps in database)',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Group deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Group deleted successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async deleteGroup(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.groupsService.deleteGroup(id, req.user.tenantId);
  }

  @Get(':id/stats')
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get group statistics',
    description: 'Retrieve message statistics for a specific chat group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Group statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalMessages: {
          type: 'number',
          example: 150,
        },
        sentMessages: {
          type: 'number',
          example: 100,
        },
        receivedMessages: {
          type: 'number',
          example: 50,
        },
        lastMessageAt: {
          type: 'string',
          format: 'date-time',
          example: '2024-01-15T10:30:00Z',
        },
        messageHistory: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              content: { type: 'string' },
              messageType: { type: 'string' },
              status: { type: 'string' },
              sentAt: { type: 'string', format: 'date-time' },
              direction: { type: 'string', enum: ['sent', 'received'] },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async getGroupStats(
    @Param('id') id: string,
    @Request() req: Request & { user: { tenantId: Types.ObjectId } },
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
    return this.groupsService.getGroupStats(id, req.user.tenantId);
  }

  @Post(':id/participants')
  @RequirePermission('canSendMessages')
  @ApiOperation({
    summary: 'Add participant to group',
    description: 'Add a new participant to an existing chat group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 201,
    description: 'Participant added successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Participant already exists in group',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async addParticipant(
    @Param('id') id: string,
    @Body() body: { phoneNumber: string },
    @Request() req: any,
  ): Promise<GroupResponseDto> {
    return this.groupsService.addParticipant(
      id,
      body.phoneNumber,
      req.user.tenantId,
    );
  }

  @Delete(':id/participants/:phoneNumber')
  @RequirePermission('canSendMessages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove participant from group',
    description: 'Remove a participant from an existing chat group',
  })
  @ApiParam({
    name: 'id',
    description: 'Group ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiParam({
    name: 'phoneNumber',
    description: 'Participant phone number',
    example: '+1234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'Participant removed successfully',
    type: GroupResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Participant not found in group',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  @ApiResponse({
    status: 404,
    description: 'Group not found',
  })
  async removeParticipant(
    @Param('id') id: string,
    @Param('phoneNumber') phoneNumber: string,
    @Request() req: any,
  ): Promise<GroupResponseDto> {
    return this.groupsService.removeParticipant(
      id,
      phoneNumber,
      req.user.tenantId,
    );
  }
}
