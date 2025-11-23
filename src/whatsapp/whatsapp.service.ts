import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TemplateContext } from './templates/template-strategy.interface';
import { TemplateStrategyRegistry } from './templates/template-strategy.registry';
import { updatePosition } from './whatsapp-messages';
import {
  IWhatsAppProvider,
  SendWhatsAppOptions,
  WhatsAppResponse,
} from './whatsapp-provider.interface';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly provider: IWhatsAppProvider;
  private readonly templateRegistry: TemplateStrategyRegistry;

  constructor(
    private readonly configService: ConfigService,
    @Inject('WHATSAPP_PROVIDER') provider: IWhatsAppProvider,
    @Inject('TEMPLATE_STRATEGY_REGISTRY')
    templateRegistry: TemplateStrategyRegistry,
  ) {
    this.provider = provider;
    this.templateRegistry = templateRegistry;
  }

  formatPhoneNumber(phone: string): string {
    return this.provider.formatPhoneNumber(phone);
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<WhatsAppResponse> {
    if (!this.provider.isConfigured()) {
      this.logger.warn('WhatsApp provider not configured.');
      return {
        success: false,
        error:
          'WhatsApp provider not configured. Configure the selected provider environment variables.',
      };
    }

    return this.provider.sendMessage(options);
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
    this.logger.log(
      `[sendQueueNotification] Iniciando envio de notificação WhatsApp`,
    );
    this.logger.debug(
      `[sendQueueNotification] Número original: ${phoneNumber}`,
    );

    const formattedPhone = this.formatPhoneNumber(phoneNumber);
    this.logger.debug(
      `[sendQueueNotification] Número formatado: ${formattedPhone}`,
    );

    this.logger.debug(
      `[sendQueueNotification] Buscando strategy 'queue_info' no registry`,
    );
    const strategy = this.templateRegistry.get('queue_info');

    if (!strategy) {
      this.logger.error(
        `[sendQueueNotification] Template strategy 'queue_info' não encontrado no registry`,
      );
      this.logger.debug(
        `[sendQueueNotification] Strategies disponíveis: ${this.templateRegistry
          .getAll()
          .map((s) => s.getName())
          .join(', ')}`,
      );
      return {
        success: false,
        error: 'Template strategy queue_info not found',
      };
    }

    this.logger.debug(
      `[sendQueueNotification] Strategy encontrada: ${strategy.constructor.name}`,
    );
    this.logger.debug(
      `[sendQueueNotification] Strategy name: ${strategy.getName()}, language: ${strategy.getLanguage()}`,
    );

    const context: TemplateContext = {
      tenantName,
      ticketToken,
      position,
      estimatedMinutes,
      ticketId,
      baseUrl,
      clientName,
      queueName,
    };

    this.logger.debug(
      `[sendQueueNotification] Context: ${JSON.stringify(context, null, 2)}`,
    );

    this.logger.debug(
      `[sendQueueNotification] Construindo template usando strategy`,
    );
    const template = strategy.buildTemplate(context);

    this.logger.debug(
      `[sendQueueNotification] Template construído: ${JSON.stringify(template, null, 2)}`,
    );

    const messageOptions = {
      to: formattedPhone,
      message: '',
      template: {
        name: template.name,
        language: template.language,
        parameters: template.parameters,
      },
    };

    this.logger.debug(
      `[sendQueueNotification] Enviando mensagem com opções: ${JSON.stringify(messageOptions, null, 2)}`,
    );

    const result = await this.provider.sendMessage(messageOptions);

    this.logger.log(
      `[sendQueueNotification] Resultado do envio: success=${result.success}, error=${result.error || 'none'}`,
    );

    return result;
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

    const formattedPhone = this.formatPhoneNumber(phoneNumber);

    return this.provider.sendMessage({
      to: formattedPhone,
      message: message,
    });
  }

  isConfigured(): boolean {
    return this.provider.isConfigured();
  }
}
