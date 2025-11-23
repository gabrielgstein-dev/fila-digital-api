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
      'Endpoint público para verificar se o WhatsApp está configurado corretamente. Retorna informações sobre o status da configuração.',
  })
  @ApiResponse({
    status: 200,
    description: 'Status da configuração WhatsApp',
    schema: {
      type: 'object',
      example: {
        configured: true,
        message: 'WhatsApp está configurado e pronto para uso',
      },
    },
  })
  async getStatus() {
    const isConfigured = this.whatsappService.isConfigured();
    return {
      configured: isConfigured,
      message: isConfigured
        ? 'WhatsApp está configurado e pronto para uso'
        : 'WhatsApp não está configurado. Verifique as variáveis de ambiente necessárias para o provedor oficial.',
    };
  }

  @Post('test')
  @Public()
  @ApiOperation({
    summary: 'Testar envio WhatsApp (público)',
    description:
      'Endpoint público para testar o envio de mensagens WhatsApp pelo provedor configurado. Use este endpoint para verificar se a configuração está funcionando corretamente.',
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
      'Endpoint público para testar o envio de mensagens WhatsApp simples (sem botões) pelo provedor configurado.',
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

  @Post('test-template')
  @Public()
  @ApiOperation({
    summary: 'Testar envio de template WhatsApp',
    description:
      'Endpoint público para testar o envio de templates WhatsApp. Permite testar qualquer template aprovado com parâmetros customizados.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'templateName', 'language', 'parameters'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone (ex: 5511999999999)',
          example: '5511999999999',
        },
        templateName: {
          type: 'string',
          description: 'Nome do template aprovado (ex: queue_info)',
          example: 'queue_info',
        },
        language: {
          type: 'string',
          description: 'Código do idioma (ex: pt_BR)',
          example: 'pt_BR',
        },
        parameters: {
          type: 'array',
          description: 'Array de parâmetros do template',
          items: {
            type: 'object',
            properties: {
              type: {
                type: 'string',
                description: 'Tipo do parâmetro (geralmente "text")',
                example: 'text',
              },
              text: {
                type: 'string',
                description: 'Texto do parâmetro',
                example: 'Atendimento Geral',
              },
            },
          },
          example: [
            { type: 'text', text: 'Atendimento Geral' },
            { type: 'text', text: 'A123' },
            { type: 'text', text: '15 minutos' },
            { type: 'text', text: '2' },
          ],
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Resultado do teste de envio de template',
    schema: {
      type: 'object',
      properties: {
        success: {
          type: 'boolean',
          description: 'Indica se o envio foi bem-sucedido',
        },
        messageSid: {
          type: 'string',
          description: 'ID da mensagem enviada',
        },
        error: {
          type: 'string',
          description: 'Mensagem de erro (se houver)',
        },
        details: {
          type: 'object',
          description: 'Detalhes adicionais do erro (se houver)',
        },
      },
    },
  })
  async testTemplate(
    @Body()
    body: {
      phoneNumber: string;
      templateName: string;
      language: string;
      parameters: Array<{ type: string; text: string }>;
    },
  ) {
    return this.whatsappService.sendWhatsApp({
      to: body.phoneNumber,
      message: '',
      template: {
        name: body.templateName,
        language: body.language,
        parameters: body.parameters,
      },
    });
  }

  @Post('send')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Enviar mensagem WhatsApp via provedor configurado (requer configuração)',
    description:
      'Envia mensagem WhatsApp automaticamente via provedor configurado. Se não configurado, retorna erro sugerindo usar geração de link.',
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
    description:
      'Mensagem WhatsApp enviada com sucesso (se o provedor estiver configurado)',
  })
  async sendWhatsApp(@Body() body: { phoneNumber: string; message: string }) {
    return this.whatsappService.sendWhatsApp({
      to: body.phoneNumber,
      message: body.message,
    });
  }
}
