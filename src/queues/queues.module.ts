import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TelegramModule } from '../telegram/telegram.module';
import { WhatsAppModule } from '../whatsapp/whatsapp.module';
import { QueueCallService } from './helpers/queue-call.service';
import { QueueStatsService } from './helpers/queue-stats.service';
import { QueueValidationService } from './helpers/queue-validation.service';
import { QueueDailyStatsService } from './queue-daily-stats.service';
import { QueueReportsController } from './queue-reports.controller';
import { QueueReportsService } from './queue-reports.service';
import { QueuesController } from './queues.controller';
import { QueuesService } from './queues.service';
import { QueueRepository } from './repositories/queue.repository';

@Module({
  imports: [
    PrismaModule,
    WhatsAppModule,
    TelegramModule,
  ],
  controllers: [QueuesController, QueueReportsController],
  providers: [
    QueuesService,
    QueueReportsService,
    QueueDailyStatsService,
    QueueRepository,
    QueueValidationService,
    QueueStatsService,
    QueueCallService,
  ],
  exports: [QueuesService, QueueReportsService, QueueDailyStatsService],
})
export class QueuesModule {}
