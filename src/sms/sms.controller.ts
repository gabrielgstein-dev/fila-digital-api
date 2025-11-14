import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SmsService } from './sms.service';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';

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
    description: 'Endpoint para testar o envio de SMS via Twilio',
  })
  @ApiResponse({
    status: 200,
    description: 'SMS enviado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        messageSid: { type: 'string' },
        error: { type: 'string' },
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
    description: 'Testa o envio de notificação de entrada na fila',
  })
  async testQueueNotification(
    @Body() body: { phoneNumber: string; queueName: string; position: number },
  ) {
    return this.smsService.sendQueueNotification(
      body.phoneNumber,
      body.queueName,
      body.position,
    );
  }

  @Post('test-call-notification')
  @ApiOperation({
    summary: 'Testar notificação de chamada',
    description: 'Testa o envio de notificação quando o ticket é chamado',
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
