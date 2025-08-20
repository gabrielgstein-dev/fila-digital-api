import { Injectable, Logger } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { EventsGateway } from '../events/events.gateway';

interface TicketCalledPayload {
  ticketId: string;
  queueName: string;
  ticketNumber: number;
  clientPhone?: string;
  clientEmail?: string;
  userId?: string;
  timestamp: string;
  messageId: string;
}

@Injectable()
export class TicketNotificationConsumer {
  private readonly logger = new Logger(TicketNotificationConsumer.name);

  constructor(private eventsGateway: EventsGateway) {}

  @EventPattern('ticket.called')
  async handleTicketCalled(@Payload() payload: TicketCalledPayload) {
    this.logger.log(`Processando chamada: ${payload.messageId}`);

    try {
      // 1. Identificar cliente
      const clientIdentifier =
        payload.userId || payload.clientPhone || payload.clientEmail;

      if (!clientIdentifier) {
        this.logger.warn(
          `Sem identificador para notificação: ${payload.messageId}`,
        );
        return;
      }

      // 2. Enviar via WebSocket (tempo real)
      this.eventsGateway.emitClientTicketCalled(clientIdentifier, {
        ticketId: payload.ticketId,
        queueName: payload.queueName,
        ticketNumber: payload.ticketNumber,
        message: `🔔 Sua senha ${payload.ticketNumber} foi chamada!`,
        title: `${payload.queueName} - Senha ${payload.ticketNumber}`,
        timestamp: payload.timestamp,
      });

      // 3. Log sucesso
      this.logger.log(
        `Notificação enviada via WebSocket para: ${clientIdentifier}`,
      );

      // TODO: Futuramente adicionar SMS/Push aqui
      // if (payload.clientPhone) {
      //   await this.sendSMS(payload);
      // }
    } catch (error) {
      this.logger.error(
        `Erro ao processar notificação ${payload.messageId}: ${error.message}`,
      );
      throw error; // RabbitMQ fará retry
    }
  }
}
