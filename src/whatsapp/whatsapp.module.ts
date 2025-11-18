import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ZApiModule } from './providers/zapi/zapi.module';
import { WhatsAppQueueService } from './whatsapp-queue.service';
import { WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';

@Module({
  imports: [ConfigModule, ZApiModule],
  providers: [WhatsAppService, WhatsAppQueueService],
  controllers: [WhatsAppController],
  exports: [WhatsAppService, WhatsAppQueueService],
})
export class WhatsAppModule {}
