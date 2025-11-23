import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosResponse } from 'axios';
import { firstValueFrom } from 'rxjs';
import {
  IWhatsAppProvider,
  SendWhatsAppOptions,
  WhatsAppResponse,
} from '../../whatsapp-provider.interface';

interface MetaMessageResponse {
  messages?: Array<{
    id?: string;
  }>;
}

@Injectable()
export class MetaWhatsappProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(MetaWhatsappProvider.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly phoneId: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    const version =
      this.configService.get<string>('META_API_VERSION') || 'v19.0';
    this.phoneId = this.configService.get<string>('META_PHONE_NUMBER_ID') || '';
    this.token = this.configService.get<string>('META_ACCESS_TOKEN') || '';
    this.apiUrl = `https://graph.facebook.com/${version}/${this.phoneId}/messages`;

    if (this.isConfigured()) {
      this.logger.log('Meta WhatsApp provider initialized');
    } else {
      this.logger.warn('Meta WhatsApp credentials not found');
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
    this.logger.debug(
      `[MetaWhatsappProvider] [sendMessage] Método chamado com opções: ${JSON.stringify(options, null, 2)}`,
    );

    if (!this.isConfigured()) {
      this.logger.warn(
        `[MetaWhatsappProvider] [sendMessage] Meta WhatsApp not configured`,
      );
      return {
        success: false,
        error: 'Meta WhatsApp not configured',
      };
    }

    const originalTo = options.to;
    const to = this.formatPhoneNumber(options.to);
    this.logger.debug(
      `[MetaWhatsappProvider] [sendMessage] Número formatado: ${originalTo} -> ${to}`,
    );

    if (options.template) {
      this.logger.debug(
        `[MetaWhatsappProvider] [sendMessage] Template detectado, chamando sendTemplateMessageWithParams`,
      );
      return this.sendTemplateMessageWithParams(
        to,
        options.template.name,
        options.template.language,
        options.template.parameters,
      );
    }

    if (this.isNotificationMessage(options.message)) {
      return this.sendTemplateMessage(to, options.message);
    }

    return this.sendTextMessage(to, options.message);
  }

  async sendButtonList(
    phone: string,
    message: string,
    buttons: Array<{ id: string; label: string }>,
  ): Promise<WhatsAppResponse> {
    this.logger.warn(
      `sendButtonList not supported for Meta WhatsApp provider: ${phone} ${message} ${buttons
        .map((button) => button.id)
        .join(',')}`,
    );
    return {
      success: false,
      error: 'Button list not supported for Meta WhatsApp provider',
    };
  }

  isConfigured(): boolean {
    return !!(this.phoneId && this.token);
  }

  private async sendTextMessage(
    to: string,
    message: string,
  ): Promise<WhatsAppResponse> {
    try {
      const payload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body: message },
      };

      const response = await firstValueFrom<AxiosResponse<MetaMessageResponse>>(
        this.httpService.post<MetaMessageResponse>(this.apiUrl, payload, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );

      const messageId =
        response.data.messages && response.data.messages[0]
          ? response.data.messages[0].id || 'N/A'
          : 'N/A';

      this.logger.log(
        `WhatsApp text sent successfully via Meta. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageSid: messageId,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
          };
          message?: string;
        };

        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const responseData = axiosError.response?.data;

        this.logger.error(
          `Failed to send WhatsApp text via Meta: ${status} ${statusText}`,
        );

        if (status === 401) {
          this.logger.error(`Erro 401 - Autenticação falhou. Verifique:`);
          this.logger.error(`1. META_ACCESS_TOKEN está válido e não expirou`);
          this.logger.error(`2. META_PHONE_NUMBER_ID está correto`);
          this.logger.error(`3. Token tem permissões para enviar mensagens`);
          this.logger.error(`Resposta da API: ${JSON.stringify(responseData)}`);
        }

        return {
          success: false,
          error: `Request failed with status code ${status}`,
          details: {
            status,
            moreInfo: statusText || undefined,
            fullResponse: responseData,
            message: axiosError.message || 'Unknown error',
          },
        };
      }

      if (error instanceof Error) {
        this.logger.error(
          `Failed to send WhatsApp text via Meta: ${error.message}`,
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

      this.logger.error('Failed to send WhatsApp text via Meta');
      return {
        success: false,
        error: 'Failed to send WhatsApp text via Meta',
      };
    }
  }

  private async sendTemplateMessage(
    to: string,
    originalContent: string,
  ): Promise<WhatsAppResponse> {
    const templateName = 'atualizacao_fila';
    const language = 'pt_BR';

    this.logger.error(
      `🔵 [MetaWhatsappProvider] [sendTemplateMessage] TEMPLATE: ${templateName} | LANGUAGE: ${language} | TO: ${to}`,
    );
    this.logger.log(
      `[MetaWhatsappProvider] [sendTemplateMessage] Iniciando envio de template`,
    );
    this.logger.error(
      `[MetaWhatsappProvider] [sendTemplateMessage] Parâmetros: to=${to}, templateName=${templateName}, language=${language}`,
    );
    this.logger.debug(
      `[MetaWhatsappProvider] [sendTemplateMessage] API URL: ${this.apiUrl}`,
    );

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: originalContent,
              },
            ],
          },
        ],
      },
    };

    this.logger.debug(
      `[MetaWhatsappProvider] [sendTemplateMessage] Payload completo: ${JSON.stringify(payload, null, 2)}`,
    );

    try {
      this.logger.debug(
        `[MetaWhatsappProvider] [sendTemplateMessage] Enviando requisição POST para ${this.apiUrl}`,
      );

      const response = await firstValueFrom<AxiosResponse<MetaMessageResponse>>(
        this.httpService.post<MetaMessageResponse>(this.apiUrl, payload, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );

      this.logger.debug(
        `[MetaWhatsappProvider] [sendTemplateMessage] Resposta recebida: ${JSON.stringify(response.data, null, 2)}`,
      );

      const messageId =
        response.data.messages && response.data.messages[0]
          ? response.data.messages[0].id || 'N/A'
          : 'N/A';

      this.logger.log(
        `WhatsApp template sent successfully via Meta. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageSid: messageId,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
          };
          message?: string;
        };

        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const responseData = axiosError.response?.data;

        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessage] ❌ ERRO ao enviar template ${templateName}: ${status} ${statusText}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessage] Payload enviado: ${JSON.stringify(payload, null, 2)}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessage] Resposta completa da API: ${JSON.stringify(responseData, null, 2)}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessage] URL da API: ${this.apiUrl}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessage] Phone ID configurado: ${this.phoneId}`,
        );

        if (status === 401) {
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] Erro 401 - Autenticação falhou. Verifique:`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 1. META_ACCESS_TOKEN está válido e não expirou`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 2. META_PHONE_NUMBER_ID está correto`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 3. Token tem permissões para enviar mensagens`,
          );
        } else if (status === 404) {
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] Erro 404 - Recurso não encontrado. Verifique:`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 1. Template '${templateName}' existe e está aprovado no Meta Business Manager`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 2. Idioma '${language}' corresponde ao idioma do template`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 3. META_PHONE_NUMBER_ID está correto: ${this.phoneId}`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessage] 4. Número de telefone está no formato correto: ${to}`,
          );
        }

        return {
          success: false,
          error: `Request failed with status code ${status}`,
          details: {
            status,
            moreInfo: statusText || undefined,
            fullResponse: responseData,
            message: axiosError.message || 'Unknown error',
          },
        };
      }

      if (error instanceof Error) {
        this.logger.error(
          `Failed to send WhatsApp template via Meta: ${error.message}`,
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

      this.logger.error('Failed to send WhatsApp template via Meta');
      return {
        success: false,
        error: 'Failed to send WhatsApp template via Meta',
      };
    }
  }

  private isNotificationMessage(message: string): boolean {
    const normalized = message.toLowerCase();
    const keywords = ['sua vez', 'chegou', 'senha', 'fila'];
    return keywords.some((keyword) => normalized.includes(keyword));
  }

  private async sendTemplateMessageWithParams(
    to: string,
    templateName: string,
    language: string,
    parameters: Array<{ type: string; text: string }>,
  ): Promise<WhatsAppResponse> {
    this.logger.error(
      `🔵 [MetaWhatsappProvider] [sendTemplateMessageWithParams] TEMPLATE: ${templateName} | LANGUAGE: ${language} | TO: ${to}`,
    );
    this.logger.log(
      `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Iniciando envio de template`,
    );
    this.logger.error(
      `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Parâmetros recebidos: to=${to}, templateName=${templateName}, language=${language}`,
    );
    this.logger.debug(
      `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Parameters: ${JSON.stringify(parameters, null, 2)}`,
    );
    this.logger.debug(
      `[MetaWhatsappProvider] [sendTemplateMessageWithParams] API URL: ${this.apiUrl}`,
    );

    const payload = {
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: language },
        components: [
          {
            type: 'body',
            parameters: parameters,
          },
        ],
      },
    };

    this.logger.debug(
      `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Payload completo: ${JSON.stringify(payload, null, 2)}`,
    );

    try {
      this.logger.debug(
        `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Enviando requisição POST para ${this.apiUrl}`,
      );

      const response = await firstValueFrom<AxiosResponse<MetaMessageResponse>>(
        this.httpService.post<MetaMessageResponse>(this.apiUrl, payload, {
          headers: { Authorization: `Bearer ${this.token}` },
        }),
      );

      this.logger.debug(
        `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Resposta recebida: ${JSON.stringify(response.data, null, 2)}`,
      );

      const messageId =
        response.data.messages && response.data.messages[0]
          ? response.data.messages[0].id || 'N/A'
          : 'N/A';

      this.logger.log(
        `WhatsApp template ${templateName} sent successfully via Meta. Message ID: ${messageId}`,
      );

      return {
        success: true,
        messageSid: messageId,
      };
    } catch (error) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as {
          response?: {
            status?: number;
            statusText?: string;
            data?: unknown;
          };
          message?: string;
        };

        const status = axiosError.response?.status;
        const statusText = axiosError.response?.statusText;
        const responseData = axiosError.response?.data;

        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessageWithParams] ❌ ERRO ao enviar template ${templateName}: ${status} ${statusText}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Payload enviado: ${JSON.stringify(payload, null, 2)}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Resposta completa da API: ${JSON.stringify(responseData, null, 2)}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessageWithParams] URL da API: ${this.apiUrl}`,
        );
        this.logger.error(
          `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Phone ID configurado: ${this.phoneId}`,
        );

        if (status === 401) {
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Erro 401 - Autenticação falhou. Verifique:`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 1. META_ACCESS_TOKEN está válido e não expirou`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 2. META_PHONE_NUMBER_ID está correto`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 3. Token tem permissões para enviar mensagens`,
          );
        } else if (status === 404) {
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] Erro 404 - Recurso não encontrado. Verifique:`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 1. Template '${templateName}' existe e está aprovado no Meta Business Manager`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 2. Idioma '${language}' corresponde ao idioma do template`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 3. META_PHONE_NUMBER_ID está correto: ${this.phoneId}`,
          );
          this.logger.error(
            `[MetaWhatsappProvider] [sendTemplateMessageWithParams] 4. Número de telefone está no formato correto: ${to}`,
          );
        }

        return {
          success: false,
          error: `Request failed with status code ${status}`,
          details: {
            status,
            moreInfo: statusText || undefined,
            fullResponse: responseData,
            message: axiosError.message || 'Unknown error',
          },
        };
      }

      if (error instanceof Error) {
        this.logger.error(
          `Failed to send WhatsApp template ${templateName} via Meta: ${error.message}`,
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

      this.logger.error(
        `Failed to send WhatsApp template ${templateName} via Meta`,
      );
      return {
        success: false,
        error: `Failed to send WhatsApp template ${templateName} via Meta`,
      };
    }
  }
}
