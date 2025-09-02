import { Injectable, Inject, Logger } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

interface TicketCalledMessage {
  ticketId: string;
  queueName: string;
  ticketNumber: string;
  clientPhone?: string;
  clientEmail?: string;
  userId?: string;
}

@Injectable()
export class TicketNotificationService {
  private readonly logger = new Logger(TicketNotificationService.name);

  constructor(@Inject('NOTIFICATION_SERVICE') private client: ClientProxy) {}

  async notifyTicketCalled(data: TicketCalledMessage): Promise<void> {
    try {
      // Enviar para RabbitMQ - simples e direto
      await this.client
        .emit('ticket.called', {
          ...data,
          timestamp: new Date(),
          messageId: `ticket-${data.ticketId}-${Date.now()}`,
        })
        .toPromise();

      this.logger.log(
        `Notificação de chamada enviada: Ticket ${data.ticketNumber} da ${data.queueName}`,
      );
    } catch (error) {
      this.logger.error(`Erro ao enviar notificação: ${error.message}`);
      // Não quebrar o fluxo principal se notificação falhar
    }
  }
}
