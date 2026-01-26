import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QueuesModule } from '../queues/queues.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TicketEstimateService } from './helpers/ticket-estimate.service';
import { TicketNotificationService } from './helpers/ticket-notification.service';
import { TicketNumberService } from './helpers/ticket-number.service';
import { TicketValidationService } from './helpers/ticket-validation.service';
import { TicketCleanupService } from './ticket-cleanup.service';
import { TicketsPublicController } from './tickets-public.controller';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    PrismaModule,
    TelegramModule,
    WhatsAppModule,
    QueuesModule,
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [
    TicketsService,
    TicketCleanupService,
    TicketEstimateService,
    TicketValidationService,
    TicketNumberService,
    TicketNotificationService,
  ],
  exports: [TicketsService, TicketCleanupService],
})
export class TicketsModule {}
