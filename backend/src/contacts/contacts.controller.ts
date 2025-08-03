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
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { ContactResponseDto } from './dto/contact-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { RequirePermission } from '../auth/decorators/permission.decorator';

@ApiTags('Contacts')
@Controller('contacts')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @RequirePermission('canSendMessages')
  @ApiOperation({
    summary: 'Create a new contact',
    description: 'Create a new contact for the current tenant',
  })
  @ApiResponse({
    status: 201,
    description: 'Contact created successfully',
    type: ContactResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Contact with this phone number already exists',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async createContact(
    @Body() createContactDto: CreateContactDto,
    @Request() req: any,
  ): Promise<ContactResponseDto> {
    return this.contactsService.createContact(
      createContactDto,
      req.user.tenantId,
      req.user.userId,
    );
  }

  @Get()
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get all contacts',
    description: 'Retrieve all contacts for the current tenant',
  })
  @ApiResponse({
    status: 200,
    description: 'Contacts retrieved successfully',
    type: [ContactResponseDto],
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
  })
  async findAllContacts(@Request() req: any): Promise<ContactResponseDto[]> {
    return this.contactsService.findAllContacts(req.user.tenantId);
  }

  @Get(':id')
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get contact by ID',
    description: 'Retrieve a specific contact by ID',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact retrieved successfully',
    type: ContactResponseDto,
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
    description: 'Contact not found',
  })
  async findContactById(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<ContactResponseDto> {
    return this.contactsService.findContactById(id, req.user.tenantId);
  }

  @Put(':id')
  @RequirePermission('canSendMessages')
  @ApiOperation({
    summary: 'Update contact',
    description: 'Update an existing contact',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact updated successfully',
    type: ContactResponseDto,
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
    description: 'Contact not found',
  })
  async updateContact(
    @Param('id') id: string,
    @Body() updateContactDto: Partial<CreateContactDto>,
    @Request() req: any,
  ): Promise<ContactResponseDto> {
    return this.contactsService.updateContact(
      id,
      updateContactDto,
      req.user.tenantId,
    );
  }

  @Delete(':id')
  @RequirePermission('canSendMessages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete contact',
    description:
      'Soft delete a contact (marks as deleted but keeps in database)',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact deleted successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Contact deleted successfully',
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
    description: 'Contact not found',
  })
  async deleteContact(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{ message: string }> {
    return this.contactsService.deleteContact(id, req.user.tenantId);
  }

  @Get(':id/stats')
  @RequirePermission('canViewLogs')
  @ApiOperation({
    summary: 'Get contact statistics',
    description: 'Retrieve message statistics for a specific contact',
  })
  @ApiParam({
    name: 'id',
    description: 'Contact ID',
    example: '507f1f77bcf86cd799439011',
  })
  @ApiResponse({
    status: 200,
    description: 'Contact statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalMessages: {
          type: 'number',
          example: 25,
        },
        sentMessages: {
          type: 'number',
          example: 15,
        },
        receivedMessages: {
          type: 'number',
          example: 10,
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
    description: 'Contact not found',
  })
  async getContactStats(
    @Param('id') id: string,
    @Request() req: any,
  ): Promise<{
    totalMessages: number;
    sentMessages: number;
    receivedMessages: number;
    lastMessageAt?: Date;
    messageHistory: Array<{
      id: string;
      content: string;
      messageType: string;
      status: string;
      sentAt: Date;
      direction: 'sent' | 'received';
    }>;
  }> {
    return this.contactsService.getContactStats(id, req.user.tenantId);
  }
}
