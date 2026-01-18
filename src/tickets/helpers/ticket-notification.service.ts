import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Ticket } from '@prisma/client';
import { TelegramService } from '../../telegram/telegram.service';
import { WhatsAppQueueService } from '../../whatsapp/whatsapp-queue.service';

@Injectable()
export class TicketNotificationService {
  private readonly logger = new Logger(TicketNotificationService.name);

  constructor(
    private configService: ConfigService,
    private telegramService: TelegramService,
    private whatsappQueueService: WhatsAppQueueService,
  ) {}

  async notifyTicketCreated(
    ticket: Ticket & {
      telegramChatId?: string | null;
      clientPhone?: string | null;
      clientName?: string | null;
    },
    queue: Queue & { tenant: { name: string } },
    position: number,
    estimatedMinutes: number,
  ): Promise<void> {
    await Promise.allSettled([
      this.sendTelegramNotification(ticket, queue, position, estimatedMinutes),
      this.sendWhatsAppNotification(ticket, queue, position, estimatedMinutes),
    ]);
  }

  private async sendTelegramNotification(
    ticket: Ticket & { telegramChatId?: string | null },
    queue: Queue & { tenant: { name: string } },
    position: number,
    estimatedMinutes: number,
  ): Promise<void> {
    if (!ticket.telegramChatId || !this.telegramService.isConfigured()) {
      return;
    }

    try {
      await this.telegramService.sendQueueStatusUpdate(
        ticket.telegramChatId,
        queue.tenant.name,
        ticket.myCallingToken,
        position,
        estimatedMinutes,
      );

      this.logger.log(
        `Notificação Telegram enviada com sucesso - Senha: ${ticket.myCallingToken}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao enviar notificação Telegram: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  private async sendWhatsAppNotification(
    ticket: Ticket & {
      clientPhone?: string | null;
      clientName?: string | null;
    },
    queue: Queue & { tenant: { name: string } },
    position: number,
    estimatedMinutes: number,
  ): Promise<void> {
    if (!ticket.clientPhone) {
      return;
    }

    try {
      const baseUrl =
        this.configService.get<string>('FRONTEND_URL') ||
        'http://localhost:3000';

      const result = await this.whatsappQueueService.enqueue(
        ticket.clientPhone,
        queue.tenant.name,
        ticket.myCallingToken,
        position,
        estimatedMinutes,
        ticket.id,
        baseUrl,
        ticket.clientName || undefined,
        queue.name,
      );

      if (result.success) {
        this.logger.log(
          `Notificação WhatsApp enviada com sucesso para ${ticket.clientPhone} - Senha: ${ticket.myCallingToken}`,
        );
      } else {
        this.logger.error(
          `Erro ao enviar WhatsApp para ${ticket.clientPhone}: ${result.error}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Erro ao enviar WhatsApp para ${ticket.clientPhone}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
