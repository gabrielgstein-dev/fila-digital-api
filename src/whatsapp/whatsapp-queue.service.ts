import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WhatsAppResponse } from './providers/zapi/whatsapp-provider.interface';
import { WhatsAppService } from './whatsapp.service';

interface QueuedMessage {
  id: string;
  phoneNumber: string;
  tenantName: string;
  ticketToken: string;
  position: number;
  estimatedMinutes: number;
  ticketId: string;
  baseUrl?: string;
  clientName?: string;
  queueName?: string;
  retryCount: number;
  createdAt: Date;
  resolve: (result: WhatsAppResponse) => void;
  reject: (error: Error) => void;
}

@Injectable()
export class WhatsAppQueueService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppQueueService.name);
  private messageQueue: QueuedMessage[] = [];
  private isProcessing = false;
  private lastSentAt: number = 0;
  private readonly minDelayBetweenMessages: number;
  private readonly maxRetries: number = 3;
  private readonly retryDelay: number = 60000; // 1 minuto

  constructor(
    private readonly whatsappService: WhatsAppService,
    private readonly configService: ConfigService,
  ) {
    this.minDelayBetweenMessages =
      parseInt(
        this.configService.get<string>('WHATSAPP_MIN_DELAY_MS') || '5000',
      ) || 5000;

    this.logger.log(
      `WhatsApp Queue Service inicializado com delay mínimo de ${this.minDelayBetweenMessages}ms entre mensagens`,
    );
  }

  async onModuleInit() {
    this.startProcessing();
  }

  async enqueue(
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
    return new Promise((resolve, reject) => {
      const message: QueuedMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        phoneNumber,
        tenantName,
        ticketToken,
        position,
        estimatedMinutes,
        ticketId,
        baseUrl,
        clientName,
        queueName,
        retryCount: 0,
        createdAt: new Date(),
        resolve,
        reject,
      };

      this.messageQueue.push(message);
      this.logger.debug(
        `Mensagem adicionada à fila. Total na fila: ${this.messageQueue.length}`,
      );

      if (!this.isProcessing) {
        this.startProcessing();
      }
    });
  }

  async enqueuePositionUpdate(
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
    return new Promise((resolve, reject) => {
      const message: QueuedMessage = {
        id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        phoneNumber,
        tenantName,
        ticketToken,
        position,
        estimatedMinutes,
        ticketId,
        baseUrl,
        clientName,
        queueName,
        retryCount: 0,
        createdAt: new Date(),
        resolve,
        reject,
      };

      this.messageQueue.push(message);
      this.logger.debug(
        `Atualização de posição adicionada à fila. Total na fila: ${this.messageQueue.length}`,
      );

      if (!this.isProcessing) {
        this.startProcessing();
      }
    });
  }

  private async startProcessing(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.logger.debug('Iniciando processamento da fila de mensagens');

    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (!message) {
        break;
      }

      try {
        await this.processMessage(message);
      } catch (error) {
        this.logger.error(`Erro ao processar mensagem ${message.id}:`, error);
        message.reject(
          error instanceof Error ? error : new Error(String(error)),
        );
      }

      if (this.messageQueue.length > 0) {
        const delay = this.calculateDelay();
        if (delay > 0) {
          this.logger.debug(
            `Aguardando ${delay}ms antes de processar próxima mensagem`,
          );
          await this.sleep(delay);
        }
      }
    }

    this.isProcessing = false;
    this.logger.debug('Processamento da fila concluído');
  }

  private async processMessage(message: QueuedMessage): Promise<void> {
    const now = Date.now();
    const timeSinceLastSent = now - this.lastSentAt;
    const delay = Math.max(0, this.minDelayBetweenMessages - timeSinceLastSent);

    if (delay > 0) {
      this.logger.debug(
        `Aguardando ${delay}ms para respeitar rate limit antes de enviar mensagem ${message.id}`,
      );
      await this.sleep(delay);
    }

    try {
      this.logger.log(
        `📤 [FILA] Enviando mensagem ${message.id} para ${message.phoneNumber} (tentativa ${message.retryCount + 1}/${this.maxRetries + 1})`,
      );

      const result = message.queueName
        ? await this.whatsappService.sendPositionUpdateNotification(
            message.phoneNumber,
            message.tenantName,
            message.ticketToken,
            message.position,
            message.estimatedMinutes,
            message.ticketId,
            message.baseUrl,
            message.clientName,
            message.queueName,
          )
        : await this.whatsappService.sendQueueNotification(
            message.phoneNumber,
            message.tenantName,
            message.ticketToken,
            message.position,
            message.estimatedMinutes,
            message.ticketId,
            message.baseUrl,
            message.clientName,
            message.queueName,
          );

      this.lastSentAt = Date.now();

      if (result.success) {
        this.logger.log(
          `✅ [FILA] Mensagem ${message.id} enviada com sucesso para ${message.phoneNumber}`,
        );
        message.resolve(result);
      } else {
        throw new Error(result.error || 'Erro desconhecido ao enviar mensagem');
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      if (message.retryCount < this.maxRetries) {
        message.retryCount++;
        const retryAfter = this.retryDelay * message.retryCount;

        this.logger.warn(
          `⚠️ [FILA] Falha ao enviar mensagem ${message.id}. Tentando novamente em ${retryAfter}ms (tentativa ${message.retryCount}/${this.maxRetries})`,
        );

        await this.sleep(retryAfter);

        this.messageQueue.unshift(message);
      } else {
        this.logger.error(
          `❌ [FILA] Mensagem ${message.id} falhou após ${this.maxRetries} tentativas. Erro: ${errorMessage}`,
        );
        message.reject(
          error instanceof Error ? error : new Error(errorMessage),
        );
      }
    }
  }

  private calculateDelay(): number {
    const now = Date.now();
    const timeSinceLastSent = now - this.lastSentAt;
    return Math.max(0, this.minDelayBetweenMessages - timeSinceLastSent);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getQueueLength(): number {
    return this.messageQueue.length;
  }

  isProcessingMessages(): boolean {
    return this.isProcessing;
  }
}
