import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { QueuesService } from './queues.service';
import { CreateQueueDto } from '../common/dto/create-queue.dto';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';

@ApiTags('queues')
@Controller()
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova fila' })
  @ApiResponse({ status: 201, description: 'Fila criada com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.create(tenantId, createQueueDto);
  }

  @Get('tenants/:tenantId/queues')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar todas as filas do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de filas' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.queuesService.findAll(tenantId);
  }

  @Get('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Buscar fila por ID' })
  @ApiResponse({ status: 200, description: 'Dados da fila' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.findOne(tenantId, id);
  }

  @Get('queues/:id/qrcode')
  @ApiOperation({ summary: 'Gerar QR Code para a fila' })
  @ApiResponse({ status: 200, description: 'QR Code da fila' })
  async generateQRCode(@Param('id') id: string) {
    return this.queuesService.generateQRCode(id);
  }

  @Put('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar fila' })
  @ApiResponse({ status: 200, description: 'Fila atualizada com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.update(tenantId, id, updateQueueDto);
  }

  @Delete('tenants/:tenantId/queues/:id')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativar fila' })
  @ApiResponse({ status: 200, description: 'Fila desativada com sucesso' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.remove(tenantId, id);
  }

  @Post('tenants/:tenantId/queues/:id/call-next')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chamar próximo ticket da fila' })
  @ApiResponse({ status: 200, description: 'Próximo ticket chamado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async callNext(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.callNext(tenantId, id);
  }

  @Post('tenants/:tenantId/queues/:id/recall')
  @UseGuards(TenantAuthGuard)
  @RequireTenant()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rechamar último ticket da fila' })
  @ApiResponse({ status: 200, description: 'Ticket rechamado' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async recall(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.recall(tenantId, id);
  }
}
