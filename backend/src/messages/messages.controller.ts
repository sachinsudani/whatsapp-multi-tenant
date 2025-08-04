import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagesService } from './messages.service';
import { QueryMessagesDto } from './dto/query-messages.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';

@ApiTags('Messages')
@Controller('messages')
@UseGuards(JwtAuthGuard, PermissionGuard)
@ApiBearerAuth()
export class MessagesController {
    constructor(private readonly messagesService: MessagesService) { }

    @Get()
    @ApiOperation({ summary: 'Get all messages with pagination and filters' })
    @ApiResponse({
        status: 200,
        description: 'Messages retrieved successfully',
    })
    async findAll(
        @Query() query: QueryMessagesDto,
        @Request() req: any,
    ) {
        const tenantId = req.user.tenantId;
        return this.messagesService.findAll(query, tenantId);
    }

    @Get('stats')
    @ApiOperation({ summary: 'Get message statistics' })
    @ApiResponse({
        status: 200,
        description: 'Message statistics retrieved successfully',
    })
    async getStats(
        @Query('period') period: string = '24h',
        @Request() req: any,
    ) {
        const tenantId = req.user.tenantId;
        return this.messagesService.getMessageStats(tenantId, period);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a specific message by ID' })
    @ApiResponse({
        status: 200,
        description: 'Message retrieved successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Message not found',
    })
    async findOne(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        const tenantId = req.user.tenantId;
        return this.messagesService.findOne(id, tenantId);
    }

    @Patch(':id/status')
    @ApiOperation({ summary: 'Update message status' })
    @ApiResponse({
        status: 200,
        description: 'Message status updated successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Message not found',
    })
    async updateStatus(
        @Param('id') id: string,
        @Body('status') status: string,
        @Request() req: any,
    ) {
        const tenantId = req.user.tenantId;
        return this.messagesService.updateMessageStatus(id, status, tenantId);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete a message' })
    @ApiResponse({
        status: 200,
        description: 'Message deleted successfully',
    })
    @ApiResponse({
        status: 404,
        description: 'Message not found',
    })
    async remove(
        @Param('id') id: string,
        @Request() req: any,
    ) {
        const tenantId = req.user.tenantId;
        return this.messagesService.remove(id, tenantId);
    }
}
