import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  SendWhatsAppOptions,
  WhatsAppResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class ZApiProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(ZApiProvider.name);
  private readonly zapiBaseUrl: string;
  private readonly zapiInstanceId: string;
  private readonly zapiInstanceToken: string;
  private readonly zapiAccountToken: string;

  constructor(private readonly configService: ConfigService) {
    this.zapiBaseUrl =
      this.configService.get<string>('ZAPI_BASE_URL') || 'https://api.z-api.io';
    this.zapiInstanceId =
      this.configService.get<string>('ZAPI_INSTANCE_ID') || '';
    this.zapiInstanceToken =
      this.configService.get<string>('ZAPI_INSTANCE_TOKEN') || '';
    this.zapiAccountToken =
      this.configService.get<string>('ZAPI_ACCOUNT_TOKEN') || '';

    if (this.zapiInstanceId && this.zapiInstanceToken) {
      this.logger.log('Z-API WhatsApp provider initialized');
    } else {
      this.logger.warn('Z-API credentials not found');
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
        this.logger.warn('Z-API not configured');
        return {
          success: false,
          error: 'Z-API not configured',
        };
      }

      let formattedPhone = this.formatPhoneNumber(options.to);
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      const phoneNumber = formattedPhone.replace('+', '');

      this.logger.debug(
        `Sending WhatsApp via Z-API to ${phoneNumber}: ${options.message}`,
      );

      const url = `${this.zapiBaseUrl}/instances/${this.zapiInstanceId}/token/${this.zapiInstanceToken}/send-text`;

      this.logger.debug(`Z-API URL: ${url}`);
      this.logger.debug(`Z-API Instance ID: ${this.zapiInstanceId}`);
      this.logger.debug(
        `Z-API Instance Token: ${this.zapiInstanceToken.substring(0, 10)}...`,
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.zapiAccountToken) {
        headers['Client-Token'] = this.zapiAccountToken;
      }

      const requestBody = {
        phone: phoneNumber,
        message: options.message,
      };

      this.logger.debug(
        `Z-API send-text request body: ${JSON.stringify(requestBody, null, 2)}`,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      this.logger.debug(
        `Z-API send-text response status: ${response.status}, body: ${responseText}`,
      );

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }

        this.logger.error(
          `Z-API error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
        return {
          success: false,
          error: `Z-API error: ${response.status}`,
          details: {
            message: (errorData.message as string) || responseText,
            status: response.status,
            fullResponse: errorData,
          },
        };
      }

      let result: Record<string, unknown> = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        this.logger.warn(`Z-API returned non-JSON response: ${responseText}`);
        result = { rawResponse: responseText };
      }

      this.logger.log(
        `WhatsApp sent successfully via Z-API. Message ID: ${result.id || result.messageId || result.zaapId || 'N/A'}`,
      );
      this.logger.debug(
        `Full Z-API response: ${JSON.stringify(result, null, 2)}`,
      );

      return {
        success: true,
        messageSid:
          (result.id as string) ||
          (result.messageId as string) ||
          (result.zaapId as string) ||
          'N/A',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp via Z-API: ${error.message}`,
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

  async sendButtonList(
    phone: string,
    message: string,
    buttons: Array<{ id: string; label: string }>,
  ): Promise<WhatsAppResponse> {
    try {
      if (!this.isConfigured()) {
        this.logger.warn('Z-API not configured');
        return {
          success: false,
          error: 'Z-API not configured',
        };
      }

      let formattedPhone = this.formatPhoneNumber(phone);
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }

      const phoneNumber = formattedPhone.replace('+', '');

      this.logger.debug(
        `Sending WhatsApp button list via Z-API to ${phoneNumber}`,
      );

      const url = `${this.zapiBaseUrl}/instances/${this.zapiInstanceId}/token/${this.zapiInstanceToken}/send-button-list`;

      this.logger.debug(`Z-API URL: ${url}`);
      this.logger.debug(`Z-API Instance ID: ${this.zapiInstanceId}`);
      this.logger.debug(
        `Z-API Instance Token: ${this.zapiInstanceToken.substring(0, 10)}...`,
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.zapiAccountToken) {
        headers['Client-Token'] = this.zapiAccountToken;
      }

      const requestBody = {
        phone: phoneNumber,
        message: message,
        buttonList: {
          buttons: buttons,
        },
      };

      this.logger.debug(
        `Z-API request body: ${JSON.stringify(requestBody, null, 2)}`,
      );

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      this.logger.debug(
        `Z-API response status: ${response.status}, body: ${responseText}`,
      );

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }

        this.logger.error(
          `Z-API button list error: ${response.status} - ${JSON.stringify(errorData)}`,
        );
        return {
          success: false,
          error: `Z-API error: ${response.status}`,
          details: {
            message: (errorData.message as string) || responseText,
            status: response.status,
            fullResponse: errorData,
          },
        };
      }

      let result: Record<string, unknown> = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        this.logger.warn(`Z-API returned non-JSON response: ${responseText}`);
        result = { rawResponse: responseText };
      }

      this.logger.log(
        `WhatsApp button list sent successfully via Z-API. Message ID: ${result.id || result.messageId || result.zaapId || 'N/A'}`,
      );
      this.logger.debug(
        `Full Z-API response: ${JSON.stringify(result, null, 2)}`,
      );

      return {
        success: true,
        messageSid:
          (result.id as string) ||
          (result.messageId as string) ||
          (result.zaapId as string) ||
          'N/A',
      };
    } catch (error) {
      this.logger.error(
        `Failed to send WhatsApp button list via Z-API: ${error.message}`,
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
    return !!(this.zapiInstanceId && this.zapiInstanceToken);
  }
}
