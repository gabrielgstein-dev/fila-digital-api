import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  SendWhatsAppOptions,
  WhatsAppResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class EvolutionProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(EvolutionProvider.name);
  private readonly evolutionApiUrl: string;
  private readonly evolutionApiKey: string;
  private readonly evolutionInstanceName: string;

  constructor(private readonly configService: ConfigService) {
    this.evolutionApiUrl =
      this.configService.get<string>('EVOLUTION_API_URL') || '';
    this.evolutionApiKey =
      this.configService.get<string>('EVOLUTION_API_KEY') || '';
    this.evolutionInstanceName =
      this.configService.get<string>('EVOLUTION_INSTANCE_NAME') || 'default';

    if (this.evolutionApiUrl && this.evolutionApiKey) {
      this.logger.log('Evolution API WhatsApp provider initialized');
    } else {
      this.logger.warn('Evolution API credentials not found');
    }
  }

  formatPhoneNumber(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');

    if (!cleaned) {
      return cleaned;
    }

    if (cleaned.startsWith('55')) {
      return cleaned;
    }

    if (cleaned.length >= 8 && cleaned.length <= 11) {
      return '55' + cleaned;
    }

    return cleaned;
  }

  async sendMessage(options: SendWhatsAppOptions): Promise<WhatsAppResponse> {
    try {
      if (!this.isConfigured()) {
        this.logger.warn('Evolution API not configured');
        return {
          success: false,
          error: 'Evolution API not configured',
        };
      }

      let formattedPhone = this.formatPhoneNumber(options.to);
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      const phoneNumber = formattedPhone.includes('@')
        ? formattedPhone.split('@')[0]
        : formattedPhone;

      this.logger.debug(
        `Sending WhatsApp via Evolution API to ${phoneNumber}: ${options.message}`,
      );

      const url = `${this.evolutionApiUrl}/message/sendText/${this.evolutionInstanceName}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: this.evolutionApiKey,
        },
        body: JSON.stringify({
          number: phoneNumber,
          text: options.message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(
          `Evolution API error: ${response.status} - ${errorText}`,
        );
        return {
          success: false,
          error: `Evolution API error: ${response.status}`,
          details: {
            message: errorText,
            status: response.status,
          },
        };
      }

      const result = await response.json();

      this.logger.log(
        `WhatsApp sent successfully via Evolution API. Message ID: ${result.key?.id || 'N/A'}`,
      );

      return {
        success: true,
        messageSid: result.key?.id || result.messageId || 'N/A',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp via Evolution API: ${error.message}`,
        error.stack,
      );
      return {
        success: false,
        error: error.message,
        details: {
          message: error.message,
        },
      };
    }
  }

  isConfigured(): boolean {
    return !!(
      this.evolutionApiUrl &&
      this.evolutionApiKey &&
      this.evolutionInstanceName
    );
  }
}

