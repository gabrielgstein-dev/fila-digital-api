import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Client } from 'pg';
import { PrismaService } from '../prisma/prisma.service';

interface TicketNotification {
  id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  queueId: string;
  timestamp: number;
}

@Injectable()
export class PostgresListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PostgresListenerService.name);
  private client: Client | null = null;
  private isListening = false;
  private readonly changeListeners = new Set<
    (notification: TicketNotification) => void
  >();

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    this.logger.log('🔄 Iniciando PostgreSQL LISTEN (não bloqueante)...');
    this.startListening().catch((error) => {
      this.logger.error(
        '❌ Erro ao iniciar PostgreSQL LISTEN (não crítico):',
        error,
      );
      this.logger.warn(
        '⚠️ Aplicação continuará sem PostgreSQL LISTEN - funcionalidade SSE pode não funcionar',
      );
    });
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  addChangeListener(
    listener: (notification: TicketNotification) => void,
  ): void {
    this.changeListeners.add(listener);
  }

  removeChangeListener(
    listener: (notification: TicketNotification) => void,
  ): void {
    this.changeListeners.delete(listener);
  }

  private async startListening(): Promise<void> {
    try {
      this.logger.log('🔌 Conectando ao PostgreSQL para LISTEN...');

      // Criar cliente PostgreSQL separado para LISTEN/NOTIFY
      this.client = new Client({
        connectionString: process.env.DATABASE_URL,
        // Configurações otimizadas para LISTEN/NOTIFY
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        // Configuração SSL obrigatória para Render
        ssl: {
          rejectUnauthorized: false,
        },
      });

      await this.client.connect();

      // Configurar listener para o canal ticket_updates
      await this.client.query('LISTEN ticket_updates');

      this.isListening = true;
      this.logger.log('✅ PostgreSQL LISTEN ativo no canal ticket_updates');

      // Configurar handler para notificações
      this.client.on('notification', (msg) => {
        this.handleNotification(msg);
      });

      // Configurar handler para erros de conexão
      this.client.on('error', (err) => {
        this.logger.error('❌ Erro na conexão PostgreSQL:', err);
        this.reconnect();
      });

      // Configurar handler para desconexão
      this.client.on('end', () => {
        this.logger.warn('🔌 Conexão PostgreSQL perdida');
        this.reconnect();
      });
    } catch (error) {
      this.logger.error('❌ Erro ao iniciar PostgreSQL LISTEN:', error);
      this.reconnect();
    }
  }

  private async stopListening(): Promise<void> {
    try {
      if (this.client) {
        this.logger.log('🛑 Parando PostgreSQL LISTEN...');
        await this.client.query('UNLISTEN ticket_updates');
        await this.client.end();
        this.client = null;
        this.isListening = false;
        this.logger.log('✅ PostgreSQL LISTEN parado');
      }
    } catch (error) {
      this.logger.error('❌ Erro ao parar PostgreSQL LISTEN:', error);
    }
  }

  private handleNotification(msg: any): void {
    try {
      if (msg.channel === 'ticket_updates' && msg.payload) {
        const notification: TicketNotification = JSON.parse(msg.payload);

        this.logger.debug(
          `📢 Notificação recebida: ${notification.action} ticket ${notification.id} na fila ${notification.queueId}`,
        );

        // Notificar todos os listeners
        for (const listener of this.changeListeners) {
          try {
            listener(notification);
          } catch (error) {
            this.logger.error('❌ Erro ao notificar listener:', error);
          }
        }
      }
    } catch (error) {
      this.logger.error('❌ Erro ao processar notificação:', error);
    }
  }

  private async reconnect(): Promise<void> {
    if (this.isListening) {
      this.logger.log('🔄 Tentando reconectar ao PostgreSQL...');

      try {
        await this.stopListening();
        await new Promise((resolve) => setTimeout(resolve, 5000)); // Aguardar 5s
        await this.startListening();
      } catch (error) {
        this.logger.error('❌ Erro na reconexão:', error);
        // Tentar novamente em 30 segundos
        setTimeout(() => this.reconnect(), 30000);
      }
    }
  }

  async getTicketById(ticketId: string): Promise<any> {
    try {
      return await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        select: {
          id: true,
          myCallingToken: true,
          status: true,
          queueId: true,
          clientName: true,
          clientPhone: true,
          clientEmail: true,
          priority: true,
          estimatedTime: true,
          calledAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar ticket ${ticketId}:`, error);
      return null;
    }
  }

  async getTicketsByQueue(queueId: string, status?: string): Promise<any[]> {
    try {
      return await this.prisma.ticket.findMany({
        where: {
          queueId,
          ...(status && { status: status as any }),
        },
        select: {
          id: true,
          myCallingToken: true,
          status: true,
          queueId: true,
          clientName: true,
          clientPhone: true,
          clientEmail: true,
          priority: true,
          estimatedTime: true,
          calledAt: true,
          completedAt: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar tickets da fila ${queueId}:`, error);
      return [];
    }
  }

  async getQueueById(queueId: string): Promise<any> {
    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        select: {
          id: true,
          name: true,
          description: true,
          queueType: true,
          isActive: true,
          capacity: true,
          avgServiceTime: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!queue) return null;

      const currentTicket = await this.prisma.ticket.findFirst({
        where: {
          queueId,
          status: 'CALLED',
        },
        orderBy: { calledAt: 'desc' },
        select: { id: true },
      });

      const previousTicket = await this.prisma.ticket.findFirst({
        where: {
          queueId,
          status: { in: ['COMPLETED', 'NO_SHOW'] },
        },
        orderBy: { calledAt: 'desc' },
        select: { id: true },
      });

      const lastCalledTicket = await this.prisma.ticket.findFirst({
        where: {
          queueId,
          calledAt: { not: null },
        },
        orderBy: { calledAt: 'desc' },
        select: { calledAt: true },
      });

      const totalProcessed = await this.prisma.ticket.count({
        where: {
          queueId,
          status: { in: ['COMPLETED', 'NO_SHOW'] },
        },
      });

      return {
        ...queue,
        currentTicketId: currentTicket?.id || null,
        previousTicketId: previousTicket?.id || null,
        lastCalledAt: lastCalledTicket?.calledAt || null,
        totalProcessed,
      };
    } catch (error) {
      this.logger.error(`❌ Erro ao buscar fila ${queueId}:`, error);
      return null;
    }
  }

  isConnected(): boolean {
    return this.isListening && this.client !== null;
  }

  getStats(): {
    isConnected: boolean;
    isListening: boolean;
    activeListeners: number;
  } {
    return {
      isConnected: this.isConnected(),
      isListening: this.isListening,
      activeListeners: this.changeListeners.size,
    };
  }
}
