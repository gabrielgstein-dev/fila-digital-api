import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TicketNotificationService } from './ticket-notification.service';
import { TicketNotificationConsumer } from './ticket-notification.consumer';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    ClientsModule.registerAsync([
      {
        name: 'NOTIFICATION_SERVICE',
        imports: [ConfigModule],
        useFactory: (configService: ConfigService) => ({
          transport: Transport.RMQ,
          options: {
            urls: [
              configService.get<string>(
                'RABBITMQ_URL',
                'amqp://localhost:5672',
              ),
            ],
            queue: 'ticket-notifications',
            queueOptions: {
              durable: true, // Fila persiste ao reiniciar RabbitMQ
            },
            // Configurações de retry automático
            socketOptions: {
              heartbeatIntervalInSeconds: 60,
              reconnectTimeInSeconds: 5,
            },
          },
        }),
        inject: [ConfigService],
      },
    ]),
    EventsModule,
  ],
  providers: [TicketNotificationService, TicketNotificationConsumer],
  exports: [TicketNotificationService],
})
export class MessagingModule {}
