import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { TicketCleanupService } from './ticket-cleanup.service';
import { EventsModule } from '../events/events.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [EventsModule, PrismaModule, SmsModule],
  controllers: [TicketsController],
  providers: [TicketsService, TicketCleanupService],
  exports: [TicketsService, TicketCleanupService],
})
export class TicketsModule {}
