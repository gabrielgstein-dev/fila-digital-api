import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiExcludeEndpoint,
} from '@nestjs/swagger';
import { AppService } from './app.service';
import { HealthResponseDto } from './common/dto/health-response.dto';
import * as path from 'path';

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
    description: 'Verifica se a API está funcionando corretamente',
  })
  @ApiResponse({
    status: 200,
    description: 'API funcionando corretamente',
    type: HealthResponseDto,
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
    description: 'Retorna informações sobre a versão da API',
  })
  @ApiResponse({
    status: 200,
    description: 'Informações de versão',
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
