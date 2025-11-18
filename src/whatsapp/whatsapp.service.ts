import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  SendWhatsAppOptions,
  WhatsAppResponse,
} from './providers/zapi/whatsapp-provider.interface';
import { ZApiProvider } from './providers/zapi/zapi.provider';
import {
  queueNotificationLink,
  startQueue,
  updatePosition,
} from './whatsapp-messages';

export interface WhatsAppLinkResponse {
  success: boolean;
  whatsappLink?: string;
  message?: string;
  error?: string;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly zapiProvider: ZApiProvider;

  constructor(
    private readonly configService: ConfigService,
    zapiProvider: ZApiProvider,
  ) {
    this.zapiProvider = zapiProvider;
  }

  formatPhoneNumber(phone: string): string {
    return this.zapiProvider.formatPhoneNumber(phone);
  }

  generateWhatsAppLink(
    phoneNumber: string,
    message: string,
  ): WhatsAppLinkResponse {
    try {
      const formattedPhone = this.formatPhoneNumber(phoneNumber);
      const encodedMessage = encodeURIComponent(message);
      const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodedMessage}`;

      return {
        success: true,
        whatsappLink,
        message: 'Link WhatsApp gerado com sucesso',
      };
    } catch (error) {
      this.logger.error(
        `Erro ao gerar link WhatsApp: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
      };
    }
  }

  generateQueueNotificationLink(
    phoneNumber: string,
    tenantName: string,
    ticketToken: string,
  ): WhatsAppLinkResponse {
    const message = queueNotificationLink({
      tenantName,
      ticketToken,
    });

    return this.generateWhatsAppLink(phoneNumber, message);
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<WhatsAppResponse> {
    if (!this.zapiProvider.isConfigured()) {
      this.logger.warn(
        'Z-API not configured. Use generateWhatsAppLink for free WhatsApp links.',
      );
      return {
        success: false,
        error:
          'Z-API not configured. Configure ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN and ZAPI_ACCOUNT_TOKEN.',
      };
    }

    return this.zapiProvider.sendMessage(options);
  }

  async sendQueueNotification(
    phoneNumber: string,
    tenantName: string,
    ticketToken: string,
    position: number,
    estimatedMinutes: number,
    ticketId: string,
    baseUrl?: string,
    clientName?: string,
    queueName?: string,
  ): Promise<WhatsAppResponse> {
    const peopleAhead = Math.max(0, position - 1);
    const firstName = clientName ? clientName.split(' ')[0] : 'Cliente';

    const message = startQueue({
      userName: firstName,
      queueName: queueName || '',
      ticketToken,
      position,
      tenantName,
      estimatedMinutes,
      peopleAhead,
    });

    this.logger.debug(
      `Preparing to send WhatsApp notification to: ${phoneNumber}`,
    );

    const cleaned = phoneNumber.replace(/\D/g, '');

    const sendSimpleMessage = async (phone: string) => {
      return this.zapiProvider.sendMessage({
        to: phone,
        message: message,
      });
    };

    if (cleaned.length === 11 && cleaned[2] === '9') {
      this.logger.debug(
        `Number has 11 digits with 9, trying both formats (with and without 9)`,
      );

      const withoutNine = cleaned.substring(0, 2) + cleaned.substring(3);
      this.logger.debug(
        `Trying format WITHOUT 9 first: ${withoutNine} (original: ${cleaned})`,
      );

      const resultWithoutNine = await sendSimpleMessage(withoutNine);

      if (resultWithoutNine.success) {
        this.logger.log(
          `Successfully sent using format WITHOUT 9th digit for ${phoneNumber}`,
        );
        return resultWithoutNine;
      }

      this.logger.debug(`Format without 9 failed, trying WITH 9: ${cleaned}`);

      const resultWithNine = await sendSimpleMessage(phoneNumber);

      if (resultWithNine.success) {
        this.logger.log(
          `Successfully sent using format WITH 9th digit for ${phoneNumber}`,
        );
        return resultWithNine;
      }

      this.logger.error(
        `Both formats failed for ${phoneNumber}. Without 9: ${resultWithoutNine.error}, With 9: ${resultWithNine.error}`,
      );

      return resultWithNine;
    } else if (cleaned.length === 10) {
      this.logger.debug(
        `Number has 10 digits, trying both formats (with and without 9)`,
      );

      const resultWithoutNine = await sendSimpleMessage(phoneNumber);

      if (resultWithoutNine.success) {
        this.logger.log(
          `Successfully sent using format WITHOUT 9th digit for ${phoneNumber}`,
        );
        return resultWithoutNine;
      }

      const withNine = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
      this.logger.debug(`Format without 9 failed, trying WITH 9: ${withNine}`);

      const resultWithNine = await sendSimpleMessage(withNine);

      if (resultWithNine.success) {
        this.logger.log(
          `Successfully sent using format WITH 9th digit for ${phoneNumber}`,
        );
        return resultWithNine;
      }

      this.logger.error(
        `Both formats failed for ${phoneNumber}. Without 9: ${resultWithoutNine.error}, With 9: ${resultWithNine.error}`,
      );

      return resultWithNine;
    }

    return sendSimpleMessage(phoneNumber);
  }

  async sendPositionUpdateNotification(
    phoneNumber: string,
    tenantName: string,
    ticketToken: string,
    position: number,
    estimatedMinutes: number,
    ticketId: string,
    baseUrl?: string,
    clientName?: string,
    queueName?: string,
  ): Promise<WhatsAppResponse> {
    const peopleAhead = Math.max(0, position - 1);

    const message = updatePosition({
      queueName: queueName || '',
      ticketToken,
      position,
      tenantName,
      estimatedMinutes,
      peopleAhead,
    });

    this.logger.debug(
      `Preparing to send WhatsApp position update notification to: ${phoneNumber}`,
    );

    const cleaned = phoneNumber.replace(/\D/g, '');

    const sendSimpleMessage = async (phone: string) => {
      return this.zapiProvider.sendMessage({
        to: phone,
        message: message,
      });
    };

    if (cleaned.length === 11 && cleaned[2] === '9') {
      this.logger.debug(
        `Number has 11 digits with 9, trying both formats (with and without 9)`,
      );

      const withoutNine = cleaned.substring(0, 2) + cleaned.substring(3);
      this.logger.debug(
        `Trying format WITHOUT 9 first: ${withoutNine} (original: ${cleaned})`,
      );

      const resultWithoutNine = await sendSimpleMessage(withoutNine);

      if (resultWithoutNine.success) {
        this.logger.log(
          `Successfully sent position update using format WITHOUT 9th digit for ${phoneNumber}`,
        );
        return resultWithoutNine;
      }

      this.logger.debug(`Format without 9 failed, trying WITH 9: ${cleaned}`);

      const resultWithNine = await sendSimpleMessage(phoneNumber);

      if (resultWithNine.success) {
        this.logger.log(
          `Successfully sent position update using format WITH 9th digit for ${phoneNumber}`,
        );
        return resultWithNine;
      }

      this.logger.error(
        `Both formats failed for ${phoneNumber}. Without 9: ${resultWithoutNine.error}, With 9: ${resultWithNine.error}`,
      );

      return resultWithNine;
    } else if (cleaned.length === 10) {
      this.logger.debug(
        `Number has 10 digits, trying both formats (with and without 9)`,
      );

      const resultWithoutNine = await sendSimpleMessage(phoneNumber);

      if (resultWithoutNine.success) {
        this.logger.log(
          `Successfully sent position update using format WITHOUT 9th digit for ${phoneNumber}`,
        );
        return resultWithoutNine;
      }

      const withNine = cleaned.substring(0, 2) + '9' + cleaned.substring(2);
      this.logger.debug(`Format without 9 failed, trying WITH 9: ${withNine}`);

      const resultWithNine = await sendSimpleMessage(withNine);

      if (resultWithNine.success) {
        this.logger.log(
          `Successfully sent position update using format WITH 9th digit for ${phoneNumber}`,
        );
        return resultWithNine;
      }

      this.logger.error(
        `Both formats failed for ${phoneNumber}. Without 9: ${resultWithoutNine.error}, With 9: ${resultWithNine.error}`,
      );

      return resultWithNine;
    }

    return sendSimpleMessage(phoneNumber);
  }

  isConfigured(): boolean {
    return this.zapiProvider.isConfigured();
  }
}
