import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SendSmsOptions {
  to: string;
  message: string;
  from?: string;
}

export interface SmsResponse {
  success: boolean;
  messageSid?: string;
  error?: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.enabled = false;
    this.logger.log('SMS service disabled. Using WhatsApp only.');
  }

  async sendSms(options: SendSmsOptions): Promise<SmsResponse> {
    try {
      return {
        success: false,
        error: 'SMS service not available',
      };
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendQueueNotification(
    phoneNumber: string,
    tenantName: string,
    ticketToken: string,
  ): Promise<SmsResponse> {
    const message = `Olá! Você entrou na fila da empresa ${tenantName} e sua senha é ${ticketToken}. Aguarde ser chamado.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  async sendCallNotification(
    phoneNumber: string,
    queueName: string,
    ticketNumber: string,
  ): Promise<SmsResponse> {
    const message = `Sua vez chegou! Ticket ${ticketNumber} da fila "${queueName}". Dirija-se ao atendimento.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  async sendQueueStatusUpdate(
    phoneNumber: string,
    queueName: string,
    newPosition: number,
  ): Promise<SmsResponse> {
    const message = `Atualização da fila "${queueName}": Você agora está na posição ${newPosition}.`;

    return this.sendSms({
      to: phoneNumber,
      message,
    });
  }

  isConfigured(): boolean {
    return this.enabled;
  }
}
