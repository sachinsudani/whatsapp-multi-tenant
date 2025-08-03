import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppController } from './whatsapp.controller';
import {
  WhatsAppSession,
  WhatsAppSessionSchema,
} from '../database/schemas/whatsapp-session.schema';
import { Message, MessageSchema } from '../database/schemas/message.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: WhatsAppSession.name, schema: WhatsAppSessionSchema },
      { name: Message.name, schema: MessageSchema },
    ]),
  ],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
  exports: [WhatsAppService],
})
export class WhatsAppModule {}
