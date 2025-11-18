import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { WhatsAppService } from './whatsapp.service';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsAppController {
  constructor(private readonly whatsappService: WhatsAppService) {}

  @Get('status')
  @Public()
  @ApiOperation({
    summary: 'Verificar status da configuração WhatsApp',
    description:
      'Endpoint público para verificar se o Z-API está configurado corretamente. Retorna informações sobre o status da configuração.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da configuração WhatsApp',
    schema: {
      type: 'object',
      example: {
        configured: true,
        message: 'Z-API está configurado e pronto para uso',
      },
    },
  })
  async getStatus() {
    const isConfigured = this.whatsappService.isConfigured();
    return {
      configured: isConfigured,
      message: isConfigured
        ? 'Z-API está configurado e pronto para uso'
        : 'Z-API não está configurado. Verifique as variáveis de ambiente ZAPI_INSTANCE_ID, ZAPI_INSTANCE_TOKEN e ZAPI_ACCOUNT_TOKEN',
    };
  }

  @Post('test')
  @Public()
  @ApiOperation({
    summary: 'Testar envio WhatsApp (público)',
    description:
      'Endpoint público para testar o envio de mensagens WhatsApp via Z-API. Use este endpoint para verificar se a configuração está funcionando corretamente.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'tenantName', 'ticketToken'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone (ex: +5511999999999)',
          example: '+5511999999999',
        },
        tenantName: {
          type: 'string',
          description: 'Nome da empresa (tenant)',
          example: 'Empresa XYZ',
        },
        ticketToken: {
          type: 'string',
          description: 'Número da senha do ticket',
          example: 'A016',
        },
        clientName: {
          type: 'string',
          description: 'Nome do cliente',
          example: 'João Silva',
        },
        queueName: {
          type: 'string',
          description: 'Nome da fila',
          example: 'Atendimento Geral',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste de envio',
  })
  async testSend(
    @Body()
    body: {
      phoneNumber: string;
      tenantName: string;
      ticketToken: string;
      clientName?: string;
      queueName?: string;
    },
  ) {
    return this.whatsappService.sendQueueNotification(
      body.phoneNumber,
      body.tenantName,
      body.ticketToken,
      1,
      5,
      'test-ticket-id',
      'http://localhost:3001',
      body.clientName,
      body.queueName,
    );
  }

  @Post('test-simple')
  @Public()
  @ApiOperation({
    summary: 'Testar envio WhatsApp simples (sem botões)',
    description:
      'Endpoint público para testar o envio de mensagens WhatsApp simples (sem botões) via Z-API. Use este endpoint para isolar problemas com botões.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'message'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone (ex: 5511999999999)',
          example: '5511999999999',
        },
        message: {
          type: 'string',
          description: 'Mensagem a ser enviada',
          example: 'Teste de mensagem simples sem botões',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste de envio',
  })
  async testSimple(
    @Body()
    body: {
      phoneNumber: string;
      message: string;
    },
  ) {
    return this.whatsappService.sendWhatsApp({
      to: body.phoneNumber,
      message: body.message,
    });
  }

  @Post('generate-link')
  @ApiOperation({
    summary: 'Gerar link WhatsApp (Click to Chat)',
    description:
      'Gera um link WhatsApp gratuito (wa.me) que abre o WhatsApp com mensagem pré-preenchida. 100% gratuito, não requer API. Use este endpoint para gerar links que o usuário pode clicar para abrir WhatsApp.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'message'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone (ex: 11999999999 ou +5511999999999)',
          example: '11999999999',
        },
        message: {
          type: 'string',
          description: 'Mensagem a ser pré-preenchida no WhatsApp',
          example:
            'Olá! Você entrou na fila da empresa XYZ e sua senha é A016.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Link WhatsApp gerado com sucesso',
    schema: {
      type: 'object',
      example: {
        success: true,
        whatsappLink:
          'https://wa.me/5511999999999?text=Ol%C3%A1%21%20Voc%C3%AA%20entrou%20na%20fila...',
        message: 'Link WhatsApp gerado com sucesso',
      },
    },
  })
  async generateLink(@Body() body: { phoneNumber: string; message: string }) {
    return this.whatsappService.generateWhatsAppLink(
      body.phoneNumber,
      body.message,
    );
  }

  @Post('test-queue-notification-link')
  @ApiOperation({
    summary: 'Testar link de notificação de fila',
    description:
      'Gera um link WhatsApp para testar a notificação de entrada na fila. 100% gratuito, não requer configuração.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'tenantName', 'ticketToken'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone',
          example: '11999999999',
        },
        tenantName: {
          type: 'string',
          description: 'Nome da empresa (tenant)',
          example: 'Empresa XYZ',
        },
        ticketToken: {
          type: 'string',
          description: 'Número da senha do ticket',
          example: 'A016',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Link de notificação gerado com sucesso',
  })
  async testQueueNotificationLink(
    @Body()
    body: {
      phoneNumber: string;
      tenantName: string;
      ticketToken: string;
    },
  ) {
    return this.whatsappService.generateQueueNotificationLink(
      body.phoneNumber,
      body.tenantName,
      body.ticketToken,
    );
  }

  @Post('send')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Enviar mensagem WhatsApp via Z-API (requer configuração)',
    description:
      'Envia mensagem WhatsApp automaticamente via Z-API. Requer configuração do Z-API. Se não configurado, retorna erro sugerindo usar geração de link.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'message'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone',
          example: '11999999999',
        },
        message: {
          type: 'string',
          description: 'Mensagem a ser enviada',
          example:
            'Olá! Você entrou na fila da empresa XYZ e sua senha é A016.',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Mensagem WhatsApp enviada com sucesso (se Z-API configurado)',
  })
  async sendWhatsApp(@Body() body: { phoneNumber: string; message: string }) {
    return this.whatsappService.sendWhatsApp({
      to: body.phoneNumber,
      message: body.message,
    });
  }
}
