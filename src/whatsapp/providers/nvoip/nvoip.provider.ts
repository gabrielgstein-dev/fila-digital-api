import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IWhatsAppProvider,
  SendWhatsAppOptions,
  WhatsAppResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class NvoipProvider implements IWhatsAppProvider {
  private readonly logger = new Logger(NvoipProvider.name);
  private readonly nvoipBaseUrl: string;
  private readonly nvoipNumbersip: string;
  private readonly nvoipUserToken: string;
  private readonly nvoipNapikey: string;
  private accessToken: string | null = null;
  private accessTokenExpiresAt: number = 0;

  constructor(private readonly configService: ConfigService) {
    this.nvoipBaseUrl =
      this.configService.get<string>('NVOIP_BASE_URL') ||
      'https://api.nvoip.com.br/v2';
    this.nvoipNumbersip =
      this.configService.get<string>('NVOIP_NUMBERSIP') || '';
    this.nvoipUserToken =
      this.configService.get<string>('NVOIP_USER_TOKEN') || '';
    this.nvoipNapikey = this.configService.get<string>('NVOIP_NAPIKEY') || '';

    if ((this.nvoipNumbersip && this.nvoipUserToken) || this.nvoipNapikey) {
      this.logger.log('✅ [NVoiP] WhatsApp provider inicializado com sucesso');
      this.logger.log(`📡 [NVoiP] Base URL: ${this.nvoipBaseUrl}`);
      if (this.nvoipNapikey) {
        this.logger.log(
          `🔑 [NVoiP] Napikey configurada: ${this.nvoipNapikey.substring(0, 10)}...`,
        );
      } else {
        this.logger.log(
          `🔑 [NVoiP] Numbersip configurado: ${this.nvoipNumbersip.substring(0, 10)}...`,
        );
        this.logger.log(
          `🔑 [NVoiP] User Token configurado: ${this.nvoipUserToken.substring(0, 10)}...`,
        );
      }
    } else {
      this.logger.warn('⚠️ [NVoiP] Credenciais não encontradas');
      this.logger.warn(`📡 [NVoiP] Base URL: ${this.nvoipBaseUrl}`);
      this.logger.warn(
        `🔑 [NVoiP] Napikey: ${this.nvoipNapikey ? 'Configurada' : 'NÃO CONFIGURADA'}`,
      );
      this.logger.warn(
        `🔑 [NVoiP] Numbersip: ${this.nvoipNumbersip ? 'Configurado' : 'NÃO CONFIGURADO'}`,
      );
      this.logger.warn(
        `🔑 [NVoiP] User Token: ${this.nvoipUserToken ? 'Configurado' : 'NÃO CONFIGURADO'}`,
      );
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
      this.logger.log('📤 [NVoiP] Iniciando envio de mensagem WhatsApp...');

      if (!this.isConfigured()) {
        this.logger.error('❌ [NVoiP] NVoiP não está configurado');
        this.logger.error(
          `🔑 [NVoiP] Numbersip: ${this.nvoipNumbersip ? 'OK' : 'FALTANDO'}`,
        );
        this.logger.error(
          `🔑 [NVoiP] User Token: ${this.nvoipUserToken ? 'OK' : 'FALTANDO'}`,
        );
        return {
          success: false,
          error: 'NVoiP not configured',
        };
      }

      const formattedPhone = this.formatPhoneNumber(options.to);
      const phoneNumber = formattedPhone.startsWith('+')
        ? formattedPhone.substring(1)
        : formattedPhone;

      this.logger.log(`📱 [NVoiP] Enviando mensagem para: ${phoneNumber}`);
      this.logger.log(
        `💬 [NVoiP] Mensagem: ${options.message.substring(0, 100)}${options.message.length > 100 ? '...' : ''}`,
      );

      const url = `${this.nvoipBaseUrl}/whatsapp/send`;

      this.logger.log(
        `🌐 [NVoiP] URL da API: ${this.nvoipBaseUrl}/whatsapp/send`,
      );
      this.logger.log(
        `🔑 [NVoiP] Numbersip: ${this.nvoipNumbersip.substring(0, 15)}...`,
      );

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        this.logger.error('❌ [NVoiP] Não foi possível obter access_token');
        return {
          success: false,
          error: 'Failed to get access token',
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.nvoipNapikey) {
        headers['Napikey'] = this.nvoipNapikey;
        this.logger.log(
          `🔐 [NVoiP] Headers: ${JSON.stringify({ ...headers, Napikey: '***' }, null, 2)}`,
        );
      } else {
        headers['Authorization'] = `Bearer ${accessToken}`;
        this.logger.log(
          `🔐 [NVoiP] Headers: ${JSON.stringify({ ...headers, Authorization: 'Bearer ***' }, null, 2)}`,
        );
      }

      const requestBody = {
        number: phoneNumber,
        message: options.message,
      };

      this.logger.log(
        `📦 [NVoiP] Request Body: ${JSON.stringify(requestBody, null, 2)}`,
      );

      this.logger.log('⏳ [NVoiP] Enviando requisição para API NVoiP...');
      const requestStartTime = Date.now();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const requestDuration = Date.now() - requestStartTime;
      const responseText = await response.text();

      this.logger.log(`⏱️  [NVoiP] Tempo de resposta: ${requestDuration}ms`);
      this.logger.log(
        `📊 [NVoiP] Status HTTP: ${response.status} ${response.statusText}`,
      );
      this.logger.log(
        `📥 [NVoiP] Response Body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`,
      );

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }

        this.logger.error('❌ [NVoiP] Erro ao enviar mensagem');
        this.logger.error(`📊 [NVoiP] Status HTTP: ${response.status}`);
        this.logger.error(
          `📥 [NVoiP] Resposta completa: ${JSON.stringify(errorData, null, 2)}`,
        );
        this.logger.error(
          `🔍 [NVoiP] Erro detalhado: ${JSON.stringify(errorData, null, 2)}`,
        );

        return {
          success: false,
          error: `NVoiP error: ${response.status}`,
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
        this.logger.warn(
          `⚠️ [NVoiP] Resposta não é JSON válido: ${responseText}`,
        );
        result = { rawResponse: responseText };
      }

      const messageId =
        (result.id as string) ||
        (result.messageId as string) ||
        (result.message_id as string) ||
        'N/A';

      this.logger.log('✅ [NVoiP] Mensagem enviada com sucesso!');
      this.logger.log(`🆔 [NVoiP] Message ID: ${messageId}`);
      this.logger.log(`📱 [NVoiP] Telefone: ${phoneNumber}`);
      this.logger.log(
        `📥 [NVoiP] Resposta completa: ${JSON.stringify(result, null, 2)}`,
      );

      return {
        success: true,
        messageSid: messageId,
      };
    } catch (error) {
      this.logger.error('❌ [NVoiP] Exceção ao enviar mensagem');
      this.logger.error(
        `🔍 [NVoiP] Tipo do erro: ${error instanceof Error ? error.constructor.name : typeof error}`,
      );
      this.logger.error(
        `💬 [NVoiP] Mensagem de erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`📚 [NVoiP] Stack trace: ${error.stack}`);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          message: error instanceof Error ? error.message : String(error),
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
      this.logger.log(
        '📤 [NVoiP] Iniciando envio de mensagem WhatsApp com botões...',
      );

      if (!this.isConfigured()) {
        this.logger.error('❌ [NVoiP] NVoiP não está configurado');
        this.logger.error(
          `🔑 [NVoiP] Numbersip: ${this.nvoipNumbersip ? 'OK' : 'FALTANDO'}`,
        );
        this.logger.error(
          `🔑 [NVoiP] User Token: ${this.nvoipUserToken ? 'OK' : 'FALTANDO'}`,
        );
        return {
          success: false,
          error: 'NVoiP not configured',
        };
      }

      const formattedPhone = this.formatPhoneNumber(phone);
      const phoneNumber = formattedPhone.startsWith('+')
        ? formattedPhone.substring(1)
        : formattedPhone;

      this.logger.log(
        `📱 [NVoiP] Enviando mensagem com botões para: ${phoneNumber}`,
      );
      this.logger.log(
        `💬 [NVoiP] Mensagem: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`,
      );
      this.logger.log(
        `🔘 [NVoiP] Botões: ${buttons.length} botão(ões) - ${buttons.map((b) => b.label).join(', ')}`,
      );

      const url = `${this.nvoipBaseUrl}/whatsapp/send-button-list`;

      this.logger.log(
        `🌐 [NVoiP] URL da API: ${this.nvoipBaseUrl}/whatsapp/send-button-list`,
      );
      this.logger.log(
        `🔑 [NVoiP] Numbersip: ${this.nvoipNumbersip.substring(0, 15)}...`,
      );

      const accessToken = await this.getAccessToken();
      if (!accessToken) {
        this.logger.error('❌ [NVoiP] Não foi possível obter access_token');
        return {
          success: false,
          error: 'Failed to get access token',
        };
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (this.nvoipNapikey) {
        headers['Napikey'] = this.nvoipNapikey;
        this.logger.log(
          `🔐 [NVoiP] Headers: ${JSON.stringify({ ...headers, Napikey: '***' }, null, 2)}`,
        );
      } else {
        headers['Authorization'] = `Bearer ${accessToken}`;
        this.logger.log(
          `🔐 [NVoiP] Headers: ${JSON.stringify({ ...headers, Authorization: 'Bearer ***' }, null, 2)}`,
        );
      }

      const requestBody = {
        number: phoneNumber,
        message: message,
        buttons: buttons.map((btn) => ({
          id: btn.id,
          title: btn.label,
        })),
      };

      this.logger.log(
        `📦 [NVoiP] Request Body: ${JSON.stringify(requestBody, null, 2)}`,
      );

      this.logger.log('⏳ [NVoiP] Enviando requisição para API NVoiP...');
      const requestStartTime = Date.now();

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      const requestDuration = Date.now() - requestStartTime;
      const responseText = await response.text();

      this.logger.log(`⏱️  [NVoiP] Tempo de resposta: ${requestDuration}ms`);
      this.logger.log(
        `📊 [NVoiP] Status HTTP: ${response.status} ${response.statusText}`,
      );
      this.logger.log(
        `📥 [NVoiP] Response Body: ${responseText.substring(0, 500)}${responseText.length > 500 ? '...' : ''}`,
      );

      if (!response.ok) {
        let errorData: Record<string, unknown> = {};
        try {
          errorData = JSON.parse(responseText);
        } catch {
          errorData = { message: responseText };
        }

        this.logger.error('❌ [NVoiP] Erro ao enviar mensagem com botões');
        this.logger.error(`📊 [NVoiP] Status HTTP: ${response.status}`);
        this.logger.error(
          `📥 [NVoiP] Resposta completa: ${JSON.stringify(errorData, null, 2)}`,
        );
        this.logger.error(
          `🔍 [NVoiP] Erro detalhado: ${JSON.stringify(errorData, null, 2)}`,
        );

        return {
          success: false,
          error: `NVoiP error: ${response.status}`,
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
        this.logger.warn(
          `⚠️ [NVoiP] Resposta não é JSON válido: ${responseText}`,
        );
        result = { rawResponse: responseText };
      }

      const messageId =
        (result.id as string) ||
        (result.messageId as string) ||
        (result.message_id as string) ||
        'N/A';

      this.logger.log('✅ [NVoiP] Mensagem com botões enviada com sucesso!');
      this.logger.log(`🆔 [NVoiP] Message ID: ${messageId}`);
      this.logger.log(`📱 [NVoiP] Telefone: ${phoneNumber}`);
      this.logger.log(
        `📥 [NVoiP] Resposta completa: ${JSON.stringify(result, null, 2)}`,
      );

      return {
        success: true,
        messageSid: messageId,
      };
    } catch (error) {
      this.logger.error('❌ [NVoiP] Exceção ao enviar mensagem com botões');
      this.logger.error(
        `🔍 [NVoiP] Tipo do erro: ${error instanceof Error ? error.constructor.name : typeof error}`,
      );
      this.logger.error(
        `💬 [NVoiP] Mensagem de erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`📚 [NVoiP] Stack trace: ${error.stack}`);
      }
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        details: {
          message: error instanceof Error ? error.message : String(error),
        },
      };
    }
  }

  private async getAccessToken(): Promise<string | null> {
    if (this.nvoipNapikey) {
      this.logger.log('🔑 [NVoiP] Usando Napikey diretamente');
      return this.nvoipNapikey;
    }

    const now = Date.now();
    if (this.accessToken && this.accessTokenExpiresAt > now + 60000) {
      this.logger.log('✅ [NVoiP] Usando access_token em cache');
      return this.accessToken;
    }

    try {
      this.logger.log('🔄 [NVoiP] Gerando novo access_token via OAuth...');
      this.logger.log(`🌐 [NVoiP] OAuth URL: ${this.nvoipBaseUrl}/oauth/token`);
      this.logger.log(
        `📤 [NVoiP] Enviando: numbersip=${this.nvoipNumbersip.substring(0, 10)}..., user_token=${this.nvoipUserToken.substring(0, 10)}...`,
      );

      const authUrl = `${this.nvoipBaseUrl}/oauth/token`;
      const authBody = {
        numbersip: this.nvoipNumbersip,
        user_token: this.nvoipUserToken,
      };

      this.logger.log(
        `📦 [NVoiP] OAuth Request Body: ${JSON.stringify({ ...authBody, numbersip: authBody.numbersip.substring(0, 10) + '...', user_token: authBody.user_token.substring(0, 10) + '...' }, null, 2)}`,
      );

      const response = await fetch(authUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(authBody),
      });

      const responseText = await response.text();
      this.logger.log(`📥 [NVoiP] OAuth Response Status: ${response.status}`);
      this.logger.log(
        `📥 [NVoiP] OAuth Response Body: ${responseText.substring(0, 500)}`,
      );

      if (!response.ok) {
        this.logger.error(
          `❌ [NVoiP] Erro ao gerar access_token: ${response.status} - ${responseText}`,
        );
        return null;
      }

      let result: Record<string, unknown> = {};
      try {
        result = JSON.parse(responseText);
      } catch {
        this.logger.error(
          `❌ [NVoiP] Resposta OAuth não é JSON válido: ${responseText}`,
        );
        return null;
      }

      this.accessToken =
        (result.access_token as string) ||
        (result.token as string) ||
        (result.accessToken as string) ||
        null;
      const expiresIn =
        (result.expires_in as number) || (result.expiresIn as number) || 86400;
      this.accessTokenExpiresAt = now + expiresIn * 1000;

      if (this.accessToken) {
        this.logger.log('✅ [NVoiP] Access_token gerado com sucesso');
        this.logger.log(
          `🆔 [NVoiP] Token: ${this.accessToken.substring(0, 20)}...`,
        );
        this.logger.log(
          `⏰ [NVoiP] Token expira em: ${Math.floor(expiresIn / 3600)} horas`,
        );
      } else {
        this.logger.error('❌ [NVoiP] Access_token não encontrado na resposta');
        this.logger.error(
          `📥 [NVoiP] Resposta completa: ${JSON.stringify(result, null, 2)}`,
        );
      }

      return this.accessToken;
    } catch (error) {
      this.logger.error('❌ [NVoiP] Exceção ao gerar access_token');
      this.logger.error(
        `💬 [NVoiP] Erro: ${error instanceof Error ? error.message : String(error)}`,
      );
      if (error instanceof Error && error.stack) {
        this.logger.error(`📚 [NVoiP] Stack: ${error.stack}`);
      }
      return null;
    }
  }

  isConfigured(): boolean {
    return !!(
      (this.nvoipNumbersip && this.nvoipUserToken) ||
      this.nvoipNapikey
    );
  }
}
