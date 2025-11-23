import { Module, forwardRef } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { TicketCleanupService } from './ticket-cleanup.service';
import { TicketsController } from './tickets.controller';
import { TicketsPublicController } from './tickets-public.controller';
import { TicketsService } from './tickets.service';

@Module({
  imports: [
    EventsModule,
    PrismaModule,
    forwardRef(() => TelegramModule),
    WhatsAppModule,
  ],
  controllers: [TicketsController, TicketsPublicController],
  providers: [TicketsService, TicketCleanupService],
  exports: [TicketsService, TicketCleanupService],
})
export class TicketsModule {}
