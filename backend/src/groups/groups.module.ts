import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import {
  ChatGroup,
  ChatGroupSchema,
} from '../database/schemas/chat-group.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatGroup.name, schema: ChatGroupSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [GroupsController],
  providers: [GroupsService],
  exports: [GroupsService],
})
export class GroupsModule {}
