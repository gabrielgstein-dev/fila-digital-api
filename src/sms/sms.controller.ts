import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { SmsService } from './sms.service';

export class TestSmsDto {
  phoneNumber: string;
  message: string;
}

@ApiTags('SMS')
@Controller('sms')
@UseGuards(TenantAuthGuard)
@ApiBearerAuth()
export class SmsController {
  constructor(private readonly smsService: SmsService) {}

  @Post('test')
  @ApiOperation({
    summary: 'Testar envio de SMS',
    description:
      'Endpoint para testar o envio de SMS via Twilio. Use este endpoint para verificar se a integração com Twilio está funcionando corretamente e testar o envio de mensagens SMS para números específicos. Útil para debug e validação de configuração.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'message'],
      properties: {
        phoneNumber: {
          type: 'string',
          description:
            'Número de telefone no formato E.164 (ex: +5511999998888)',
          example: '+5511999998888',
        },
        message: {
          type: 'string',
          description: 'Mensagem a ser enviada',
          example: 'Teste de SMS da Fila Digital',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'SMS enviado com sucesso. Retorna informações sobre o envio incluindo SID da mensagem.',
    schema: {
      type: 'object',
      example: {
        success: true,
        messageSid: 'SM1234567890abcdef1234567890abcdef',
        phoneNumber: '+5511999998888',
        status: 'sent',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos ou número de telefone inválido.',
    schema: {
      type: 'object',
      example: {
        statusCode: 400,
        message: 'Número de telefone inválido',
        error: 'Bad Request',
      },
    },
  })
  async testSms(@Body() testSmsDto: TestSmsDto) {
    return this.smsService.sendSms({
      to: testSmsDto.phoneNumber,
      message: testSmsDto.message,
    });
  }

  @Post('test-queue-notification')
  @ApiOperation({
    summary: 'Testar notificação de fila',
    description:
      'Testa o envio de notificação SMS quando um cliente entra na fila. Simula a mensagem que seria enviada automaticamente quando um ticket é criado. Use este endpoint para testar o formato e conteúdo das notificações de entrada na fila.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'tenantName', 'ticketToken'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone no formato E.164',
          example: '+5511999998888',
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
    description:
      'Notificação de fila enviada com sucesso. Retorna informações sobre o envio.',
    schema: {
      type: 'object',
      example: {
        success: true,
        messageSid: 'SM1234567890abcdef1234567890abcdef',
        message:
          'Olá! Você entrou na fila da empresa Empresa XYZ e sua senha é A016. Aguarde ser chamado.',
      },
    },
  })
  async testQueueNotification(
    @Body()
    body: {
      phoneNumber: string;
      tenantName: string;
      ticketToken: string;
    },
  ) {
    return this.smsService.sendQueueNotification(
      body.phoneNumber,
      body.tenantName,
      body.ticketToken,
    );
  }

  @Post('test-call-notification')
  @ApiOperation({
    summary: 'Testar notificação de chamada',
    description:
      'Testa o envio de notificação SMS quando um ticket é chamado. Simula a mensagem que seria enviada automaticamente quando um atendente chama o próximo cliente. Use este endpoint para testar o formato e conteúdo das notificações de chamada.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['phoneNumber', 'queueName', 'ticketNumber'],
      properties: {
        phoneNumber: {
          type: 'string',
          description: 'Número de telefone no formato E.164',
          example: '+5511999998888',
        },
        queueName: {
          type: 'string',
          description: 'Nome da fila',
          example: 'Atendimento Geral',
        },
        ticketNumber: {
          type: 'string',
          description: 'Número da senha/ticket',
          example: 'A016',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Notificação de chamada enviada com sucesso. Retorna informações sobre o envio.',
    schema: {
      type: 'object',
      example: {
        success: true,
        messageSid: 'SM1234567890abcdef1234567890abcdef',
        message: 'Sua senha A016 foi chamada na fila Atendimento Geral!',
      },
    },
  })
  async testCallNotification(
    @Body()
    body: {
      phoneNumber: string;
      queueName: string;
      ticketNumber: string;
    },
  ) {
    return this.smsService.sendCallNotification(
      body.phoneNumber,
      body.queueName,
      body.ticketNumber,
    );
  }
}
