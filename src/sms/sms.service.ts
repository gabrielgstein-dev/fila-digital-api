import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

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
  private readonly twilioClient: Twilio;
  private readonly defaultFromNumber: string;

  constructor(private readonly configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_SID');
    const authToken = this.configService.get<string>('TWILIO_TOKEN');

    if (!accountSid || !authToken) {
      this.logger.warn(
        'Twilio credentials not found. SMS service will be disabled.',
      );
      return;
    }

    this.twilioClient = new Twilio(accountSid, authToken);
    this.defaultFromNumber =
      this.configService.get<string>('TWILIO_FROM_NUMBER') || '';

    this.logger.log('Twilio SMS service initialized successfully');
  }

  async sendSms(options: SendSmsOptions): Promise<SmsResponse> {
    try {
      if (!this.twilioClient) {
        this.logger.error(
          'Twilio client not initialized. Check your credentials.',
        );
        return {
          success: false,
          error: 'SMS service not available',
        };
      }

      const fromNumber = options.from || this.defaultFromNumber;

      if (!fromNumber) {
        this.logger.error('No from number specified and no default configured');
        return {
          success: false,
          error: 'No sender number configured',
        };
      }

      this.logger.debug(`Sending SMS to ${options.to}: ${options.message}`);

      const message = await this.twilioClient.messages.create({
        body: options.message,
        from: fromNumber,
        to: options.to,
      });

      this.logger.log(`SMS sent successfully. Message SID: ${message.sid}`);

      return {
        success: true,
        messageSid: message.sid,
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
    return !!this.twilioClient;
  }
}
