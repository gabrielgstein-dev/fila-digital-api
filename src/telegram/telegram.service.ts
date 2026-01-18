import {
    Injectable,
    Logger,
    OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ModuleRef } from '@nestjs/core';
import TelegramBot from 'node-telegram-bot-api';
import { CreateTicketDto } from '../common/dto/create-ticket.dto';
import { PrismaService } from '../prisma/prisma.service';

export interface SendMessageOptions {
  chatId: string | number;
  message: string;
  parseMode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  replyMarkup?: TelegramBot.InlineKeyboardMarkup;
}

export interface TelegramResponse {
  success: boolean;
  messageId?: number;
  error?: string;
}

@Injectable()
export class TelegramService implements OnModuleInit {
  private readonly logger = new Logger(TelegramService.name);
  private bot: TelegramBot | null = null;
  private readonly botToken: string | null;

  private ticketsService: any;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {
    this.botToken =
      this.configService.get<string>('TELEGRAM_BOT_TOKEN') || null;

    if (!this.botToken) {
      this.logger.warn(
        'TELEGRAM_BOT_TOKEN não encontrado. Serviço Telegram desabilitado.',
      );
    }
  }

  async onModuleInit() {
    if (!this.botToken) {
      return;
    }

    try {
      const webhookUrl = this.configService.get<string>('TELEGRAM_WEBHOOK_URL');
      const useWebhook = !!webhookUrl;

      if (useWebhook) {
        this.bot = new TelegramBot(this.botToken);
        this.logger.log('Telegram bot inicializado com webhook');
      } else {
        this.bot = new TelegramBot(this.botToken, { polling: true });
        this.logger.log('Telegram bot inicializado com polling');
      }

      this.setupCommands();

      try {
        const { TicketsService } = await import('../tickets/tickets.service');
        this.ticketsService = this.moduleRef.get(TicketsService, { strict: false });
      } catch (e) {
        this.logger.warn('TicketsService não disponível para comandos Telegram');
      }
    } catch (error) {
      this.logger.error(`Erro ao inicializar bot Telegram: ${error.message}`);
    }
  }

  private setupCommands() {
    if (!this.bot) return;

    this.bot.onText(/\/start(.*)/, async (msg, match) => {
      const startParam = match?.[1]?.trim();
      if (startParam) {
        if (startParam.startsWith('queue_')) {
          const queueId = startParam.replace('queue_', '');
          await this.handleQueueStart(msg, queueId);
        } else if (startParam.startsWith('ticket_')) {
          const ticketId = startParam.replace('ticket_', '');
          await this.handleTicketStart(msg, ticketId);
        } else {
          await this.handleStart(msg);
        }
      } else {
        await this.handleStart(msg);
      }
    });

    this.bot.onText(/\/ajuda/, async (msg) => {
      await this.handleHelp(msg);
    });

    this.bot.onText(/\/pegar_ticket/, async (msg) => {
      await this.handleGetTicket(msg);
    });

    this.bot.onText(/\/status/, async (msg) => {
      await this.handleStatus(msg);
    });

    this.bot.on('callback_query', async (query) => {
      await this.handleCallbackQuery(query);
    });

    this.bot.on('message', async (msg) => {
      if (msg.text && !msg.text.startsWith('/')) {
        await this.handleMessage(msg);
      }
    });
  }

  private async handleStart(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;
    const userName = msg.from?.first_name || 'Usuário';

    const welcomeMessage = `
👋 Olá, ${userName}!

Bem-vindo ao sistema de fila digital!

📋 <b>Comandos disponíveis:</b>
/pegar_ticket - Pegar um ticket (entrar na fila)
/status - Ver status do seu ticket atual
/ajuda - Ver ajuda e informações

Use /pegar_ticket para começar!
    `.trim();

    await this.sendMessage({
      chatId,
      message: welcomeMessage,
      parseMode: 'HTML',
    });
  }

  private async handleQueueStart(msg: TelegramBot.Message, queueId: string) {
    const chatId = msg.chat.id;

    try {
      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        include: {
          tenant: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!queue || !queue.isActive || !queue.tenant.isActive) {
        await this.sendMessage({
          chatId,
          message: '❌ Esta fila não está disponível no momento.',
        });
        return;
      }

      const waitingTickets = await this.prisma.ticket.count({
        where: {
          queueId,
          status: 'WAITING',
        },
      });

      if (waitingTickets >= queue.capacity) {
        await this.sendMessage({
          chatId,
          message: `❌ A fila "${queue.name}" está cheia. Tente novamente mais tarde.`,
        });
        return;
      }

      const createTicketDto: CreateTicketDto = {
        clientName: msg.from?.first_name || `Telegram: ${chatId}`,
        telegramChatId: chatId.toString(),
      };

      const ticket = await this.ticketsService.create(
        queueId,
        createTicketDto,
        undefined,
      );

      const position = waitingTickets + 1;
      const estimatedMinutes = Math.ceil(
        (position * queue.avgServiceTime) / 60,
      );

      const successMessage = `
✅ <b>Você entrou na fila!</b>

<b>Senha:</b> ${ticket.myCallingToken}
<b>Fila:</b> ${queue.name}
<b>Posição:</b> ${position}
<b>Tempo estimado:</b> ${estimatedMinutes} min

Você será notificado quando sua vez chegar!
Use /status para acompanhar sua posição.
      `.trim();

      await this.sendMessage({
        chatId,
        message: successMessage,
        parseMode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Erro ao processar início de fila: ${error.message}`);
      await this.sendMessage({
        chatId,
        message: '❌ Erro ao entrar na fila. Tente novamente.',
      });
    }
  }

  private async handleTicketStart(msg: TelegramBot.Message, ticketId: string) {
    const chatId = msg.chat.id;

    try {
      const ticket = await this.prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          queue: {
            select: {
              name: true,
              avgServiceTime: true,
            },
          },
        },
      });

      if (!ticket) {
        await this.sendMessage({
          chatId,
          message: '❌ Ticket não encontrado.',
        });
        return;
      }

      const waitingTickets = await this.prisma.ticket.count({
        where: {
          queueId: ticket.queueId,
          status: 'WAITING',
          createdAt: {
            lt: ticket.createdAt,
          },
        },
      });

      const position = waitingTickets + 1;
      const estimatedMinutes = Math.ceil(
        (position * ticket.queue.avgServiceTime) / 60,
      );

      let statusEmoji = '⏳';
      let statusText = 'Aguardando';
      if (ticket.status === 'CALLED') {
        statusEmoji = '🔔';
        statusText = 'Sua vez chegou!';
      }

      const statusMessage = `
${statusEmoji} <b>Seu Ticket</b>

<b>Senha:</b> ${ticket.myCallingToken}
<b>Fila:</b> ${ticket.queue.name}
<b>Status:</b> ${statusText}
<b>Posição:</b> ${position}${ticket.status === 'WAITING' ? ` (${waitingTickets} pessoas na frente)` : ''}
<b>Tempo estimado:</b> ${estimatedMinutes} min

${ticket.status === 'CALLED' ? '🚨 <b>Dirija-se ao atendimento!</b>' : '⏰ Aguarde sua vez ser chamada.'}
      `.trim();

      await this.sendMessage({
        chatId,
        message: statusMessage,
        parseMode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Erro ao processar ticket: ${error.message}`);
      await this.sendMessage({
        chatId,
        message: '❌ Erro ao buscar informações do ticket.',
      });
    }
  }

  private async handleHelp(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    const helpMessage = `
📚 <b>Ajuda - Sistema de Fila Digital</b>

<b>Comandos:</b>
/start - Iniciar o bot
/pegar_ticket - Pegar um ticket e entrar na fila
/status - Ver o status do seu ticket atual
/ajuda - Mostrar esta mensagem de ajuda

<b>Como usar:</b>
1. Use /pegar_ticket para ver as filas disponíveis
2. Escolha uma fila clicando no botão
3. Você receberá seu número de senha
4. Use /status para acompanhar sua posição na fila
5. Você será notificado quando sua vez chegar!

<b>Dúvidas?</b>
Entre em contato com o suporte.
    `.trim();

    await this.sendMessage({
      chatId,
      message: helpMessage,
      parseMode: 'HTML',
    });
  }

  private async handleGetTicket(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    try {
      const queues = await this.prisma.queue.findMany({
        where: {
          isActive: true,
          tenant: {
            isActive: true,
          },
        },
        select: {
          id: true,
          name: true,
          description: true,
          queueType: true,
          _count: {
            select: {
              tickets: {
                where: {
                  status: 'WAITING',
                },
              },
            },
          },
        },
        orderBy: {
          name: 'asc',
        },
      });

      if (queues.length === 0) {
        await this.sendMessage({
          chatId,
          message: '❌ Nenhuma fila disponível no momento.',
        });
        return;
      }

      const keyboard: TelegramBot.InlineKeyboardButton[][] = queues.map(
        (queue) => [
          {
            text: `${queue.name} (${queue._count.tickets} aguardando)`,
            callback_data: `queue_${queue.id}`,
          },
        ],
      );

      await this.sendMessage({
        chatId,
        message: '📋 <b>Escolha uma fila:</b>',
        parseMode: 'HTML',
        replyMarkup: {
          inline_keyboard: keyboard,
        },
      });
    } catch (error) {
      this.logger.error(`Erro ao listar filas: ${error.message}`);
      await this.sendMessage({
        chatId,
        message: '❌ Erro ao buscar filas disponíveis. Tente novamente.',
      });
    }
  }

  private async handleStatus(msg: TelegramBot.Message) {
    const chatId = msg.chat.id.toString();

    try {
      const ticket = await this.prisma.ticket.findFirst({
        where: {
          status: {
            in: ['WAITING', 'CALLED'],
          },
        },
        include: {
          queue: {
            select: {
              name: true,
              avgServiceTime: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (
        !ticket ||
        (ticket as { telegramChatId?: string }).telegramChatId !== chatId
      ) {
        await this.sendMessage({
          chatId,
          message:
            '❌ Você não possui nenhum ticket ativo no momento.\n\nUse /pegar_ticket para pegar um novo ticket.',
        });
        return;
      }

      const waitingTickets = await this.prisma.ticket.count({
        where: {
          queueId: ticket.queueId,
          status: 'WAITING',
          createdAt: {
            lt: ticket.createdAt,
          },
        },
      });

      const position = waitingTickets + 1;
      const estimatedMinutes = Math.ceil(
        (position * ticket.queue.avgServiceTime) / 60,
      );

      let statusEmoji = '⏳';
      let statusText = 'Aguardando';
      if (ticket.status === 'CALLED') {
        statusEmoji = '🔔';
        statusText = 'Sua vez chegou!';
      }

      const statusMessage = `
${statusEmoji} <b>Status do seu Ticket</b>

<b>Senha:</b> ${ticket.myCallingToken}
<b>Fila:</b> ${ticket.queue.name}
<b>Status:</b> ${statusText}
<b>Posição:</b> ${position}${ticket.status === 'WAITING' ? ` (${waitingTickets} pessoas na frente)` : ''}
<b>Tempo estimado:</b> ${estimatedMinutes} min

${ticket.status === 'CALLED' ? '🚨 <b>Dirija-se ao atendimento!</b>' : '⏰ Aguarde sua vez ser chamada.'}
      `.trim();

      await this.sendMessage({
        chatId,
        message: statusMessage,
        parseMode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Erro ao buscar status: ${error.message}`);
      await this.sendMessage({
        chatId,
        message: '❌ Erro ao buscar status do ticket. Tente novamente.',
      });
    }
  }

  private async handleCallbackQuery(query: TelegramBot.CallbackQuery) {
    if (!query.data || !query.message) return;

    const chatId = query.message.chat.id;
    const data = query.data;

    if (data.startsWith('queue_')) {
      const queueId = data.replace('queue_', '');
      await this.processQueueSelection(chatId, queueId, query.id);
    }
  }

  private async processQueueSelection(
    chatId: number,
    queueId: string,
    queryId: string,
  ) {
    try {
      if (!this.bot) return;

      await this.bot.answerCallbackQuery(queryId, {
        text: 'Processando...',
      });

      const queue = await this.prisma.queue.findUnique({
        where: { id: queueId },
        include: {
          tenant: {
            select: {
              isActive: true,
            },
          },
        },
      });

      if (!queue || !queue.isActive || !queue.tenant.isActive) {
        await this.sendMessage({
          chatId,
          message: '❌ Esta fila não está disponível no momento.',
        });
        return;
      }

      const waitingTickets = await this.prisma.ticket.count({
        where: {
          queueId,
          status: 'WAITING',
        },
      });

      if (waitingTickets >= queue.capacity) {
        await this.sendMessage({
          chatId,
          message: `❌ A fila "${queue.name}" está cheia. Tente outra fila.`,
        });
        return;
      }

      const createTicketDto: CreateTicketDto = {
        clientName: `Telegram: ${chatId}`,
        telegramChatId: chatId.toString(),
      };

      const ticket = await this.ticketsService.create(
        queueId,
        createTicketDto,
        undefined,
      );

      const position = waitingTickets + 1;
      const estimatedMinutes = Math.ceil(
        (position * queue.avgServiceTime) / 60,
      );

      const successMessage = `
✅ <b>Ticket criado com sucesso!</b>

<b>Senha:</b> ${ticket.myCallingToken}
<b>Fila:</b> ${queue.name}
<b>Posição:</b> ${position}
<b>Tempo estimado:</b> ${estimatedMinutes} min

Você será notificado quando sua vez chegar!
Use /status para acompanhar sua posição.
      `.trim();

      await this.sendMessage({
        chatId,
        message: successMessage,
        parseMode: 'HTML',
      });
    } catch (error) {
      this.logger.error(`Erro ao criar ticket: ${error.message}`);
      await this.sendMessage({
        chatId,
        message: '❌ Erro ao criar ticket. Tente novamente.',
      });
    }
  }

  private async handleMessage(msg: TelegramBot.Message) {
    const chatId = msg.chat.id;

    await this.sendMessage({
      chatId,
      message: '❓ Não entendi. Use /ajuda para ver os comandos disponíveis.',
    });
  }

  async sendMessage(options: SendMessageOptions): Promise<TelegramResponse> {
    try {
      if (!this.bot) {
        this.logger.warn('Bot Telegram não inicializado');
        return {
          success: false,
          error: 'Bot Telegram não configurado',
        };
      }

      const message = await this.bot.sendMessage(
        options.chatId,
        options.message,
        {
          parse_mode: options.parseMode,
          reply_markup: options.replyMarkup,
        },
      );

      return {
        success: true,
        messageId: message.message_id,
      };
    } catch (error) {
      this.logger.error(`Erro ao enviar mensagem Telegram: ${error.message}`);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async sendTicketNotification(
    chatId: string,
    ticketNumber: string,
    queueName: string,
  ): Promise<TelegramResponse> {
    const message = `
🔔 <b>Sua vez chegou!</b>

<b>Senha:</b> ${ticketNumber}
<b>Fila:</b> ${queueName}

🚨 <b>Dirija-se ao atendimento imediatamente!</b>
    `.trim();

    return this.sendMessage({
      chatId,
      message,
      parseMode: 'HTML',
    });
  }

  async sendQueueStatusUpdate(
    chatId: string,
    tenantName: string,
    ticketToken: string,
    position: number,
    estimatedMinutes: number,
  ): Promise<TelegramResponse> {
    const message = `
✅ <b>Você entrou na fila!</b>

<b>Empresa:</b> ${tenantName}
<b>Sua senha:</b> ${ticketToken}
<b>Sua posição:</b> ${position}
<b>Tempo estimado:</b> ${estimatedMinutes} min

⏳ Aguarde ser chamado...
    `.trim();

    return this.sendMessage({
      chatId,
      message,
      parseMode: 'HTML',
    });
  }

  isConfigured(): boolean {
    return !!this.bot && !!this.botToken;
  }
}
