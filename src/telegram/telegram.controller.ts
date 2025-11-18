import { Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TelegramService } from './telegram.service';

@ApiTags('telegram')
@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);

  constructor(private readonly telegramService: TelegramService) {}

  @Post('webhook')
  @Public()
  @ApiOperation({
    summary: 'Webhook do Telegram',
    description:
      'Endpoint público para receber atualizações do Telegram Bot. Este endpoint é usado pelo Telegram para enviar mensagens, comandos e eventos do bot. Use este endpoint para configurar o webhook do bot no Telegram. Não requer autenticação, pois é um callback público do Telegram.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Webhook processado com sucesso. Retorna confirmação de processamento.',
    schema: {
      type: 'object',
      example: {
        ok: true,
        message: 'Webhook processado',
      },
    },
  })
  async handleWebhook() {
    this.logger.debug('Webhook recebido do Telegram');
    return { ok: true };
  }
}
