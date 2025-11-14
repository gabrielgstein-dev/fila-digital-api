import { Module } from '@nestjs/common';
import { MessagingModule } from '../messaging/messaging.module';
import { SmsModule } from '../sms/sms.module';
import { TicketsModule } from '../tickets/tickets.module';
import { QueueDailyStatsService } from './queue-daily-stats.service';
import { QueueReportsController } from './queue-reports.controller';
import { QueueReportsService } from './queue-reports.service';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';

@Module({
  imports: [MessagingModule, SmsModule, TicketsModule],
  controllers: [QueuesController, QueueReportsController],
  providers: [QueuesService, QueueReportsService, QueueDailyStatsService],
  exports: [QueuesService, QueueReportsService, QueueDailyStatsService],
})
export class QueuesModule {}
