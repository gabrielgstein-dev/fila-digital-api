import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { IgniterService } from './igniter.service';
import { PostgresListenerService } from './postgres-listener.service';
import { TicketRealtimeOptimizedController } from './ticket-realtime-optimized.controller';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [
    IgniterService,
    PostgresListenerService,
    TicketRealtimeOptimizedController,
  ],
  exports: [
    IgniterService,
    PostgresListenerService,
    TicketRealtimeOptimizedController,
  ],
})
export class IgniterModule {}
