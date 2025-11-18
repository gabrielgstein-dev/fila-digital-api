import { Module, forwardRef } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { TelegramModule } from '../telegram/telegram.module';
import { TicketsModule } from '../tickets/tickets.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { QueueDailyStatsService } from './queue-daily-stats.service';
import { QueueReportsController } from './queue-reports.controller';
import { QueueReportsService } from './queue-reports.service';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [
    MessagingModule,
    TicketsModule,
    WhatsAppModule,
    forwardRef(() => TelegramModule),
  ],
  controllers: [QueuesController, QueueReportsController],
  providers: [QueuesService, QueueReportsService, QueueDailyStatsService],
  exports: [QueuesService, QueueReportsService, QueueDailyStatsService],
})
export class QueuesModule {}
