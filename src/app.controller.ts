import { Controller, Get } from '@nestjs/common';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto } from './common/dto/health-response.dto';

@ApiTags('system')
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @ApiExcludeEndpoint()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  @ApiOperation({
    summary: 'Health Check',
    description:
      'Verifica se a API está funcionando corretamente. Este endpoint é usado para monitoramento, load balancers e verificação de status do serviço. Retorna status da API e timestamp atual. Use este endpoint para verificar a disponibilidade da API, integração com ferramentas de monitoramento (Prometheus, Datadog, etc.) e health checks de infraestrutura.',
  })
  @ApiResponse({
    status: 200,
    description: 'API funcionando corretamente. Retorna status e timestamp.',
    type: HealthResponseDto,
    schema: {
      type: 'object',
      example: {
        status: 'ok',
        timestamp: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('version')
  @ApiOperation({
    summary: 'Informações de Versão',
    description:
      'Retorna informações detalhadas sobre a versão da API, ambiente de execução e versão do Node.js. Use este endpoint para verificar a versão atual da API em produção, identificar o ambiente (desenvolvimento, staging, produção), diagnosticar problemas relacionados à versão e para fins de debugging e suporte técnico.',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações de versão retornadas com sucesso.',
    schema: {
      type: 'object',
      example: {
        name: 'fila-api',
        version: '1.0.11-stage-with-cleanup',
        environment: 'production',
        nodeVersion: 'v22.0.0',
        timestamp: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  getVersion() {
    // Versão temporária hardcoded para não atrasar o deploy
    return {
      name: 'fila-api',
      version: '1.0.11-stage-with-cleanup',
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
      timestamp: new Date().toISOString(),
    };
  }
}
