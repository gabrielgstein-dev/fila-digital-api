import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { TenantsModule } from './tenants/tenants.module';
import { QueuesModule } from './queues/queues.module';
import { TicketsModule } from './tickets/tickets.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { ClientsModule } from './clients/clients.module';
import { MessagingModule } from './messaging/messaging.module';
import { AgentsModule } from './agents/agents.module';
import { CorporateUsersModule } from './corporate-users/corporate-users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { SmsModule } from './sms/sms.module';
import { IgniterModule } from './rt/igniter.module';
import { SanitizeInterceptor } from './common/interceptors/sanitize.interceptor';
import { TenantFilterInterceptor } from './common/interceptors/tenant-filter.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 100, // Aumentado para testes
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 1000, // Aumentado para testes
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 10000, // Aumentado para testes
      },
    ]),
    PrismaModule,
    TenantsModule,
    AuthModule.forRoot(),
    QueuesModule,
    TicketsModule,
    EventsModule,
    ClientsModule,
    MessagingModule,
    AgentsModule,
    CorporateUsersModule,
    DashboardModule,
    SmsModule,
    IgniterModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SanitizeInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TenantFilterInterceptor,
    },
  ],
})
export class AppModule {}
