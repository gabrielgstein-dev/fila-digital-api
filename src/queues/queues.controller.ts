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
import {
  CurrentTenant,
  CurrentUser,
} from '../auth/decorators/current-tenant.decorator';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('queues')
@Controller('tenants/:tenantId/queues')
@UseGuards(TenantAuthGuard)
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova fila' })
  @ApiResponse({ status: 201, description: 'Fila criada com sucesso' })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createQueueDto: CreateQueueDto,
    @CurrentUser() user: any,
    @CurrentTenant() tenant: any,
  ) {
    return this.queuesService.create(tenantId, createQueueDto);
  }

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar filas do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de filas' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.queuesService.findAll(tenantId);
  }

  @Get('all-tickets')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos os clientes em todas as filas do tenant',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista consolidada de todos os tickets ativos em todas as filas',
    schema: {
      type: 'object',
      properties: {
        summary: {
          type: 'object',
          properties: {
            totalQueues: { type: 'number' },
            totalWaiting: { type: 'number' },
            totalCalled: { type: 'number' },
            totalCompleted: { type: 'number' },
            avgWaitTime: { type: 'number' },
          },
        },
        queues: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              queueType: { type: 'string' },
              currentNumber: { type: 'number' },
              totalWaiting: { type: 'number' },
              tickets: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'string' },
                    number: { type: 'number' },
                    clientName: { type: 'string' },
                    clientPhone: { type: 'string' },
                    status: { type: 'string' },
                    priority: { type: 'number' },
                    estimatedTime: { type: 'number' },
                    createdAt: { type: 'string' },
                    calledAt: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
  })
  async getAllTickets(@Param('tenantId') tenantId: string) {
    return this.queuesService.getAllTickets(tenantId);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Buscar fila por ID' })
  @ApiResponse({ status: 200, description: 'Dados da fila' })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.findOne(tenantId, id);
  }

  @Put(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Atualizar fila' })
  @ApiResponse({ status: 200, description: 'Fila atualizada com sucesso' })
  async update(
    @Param('tenantId') tenantId: string,
    @Param('id') id: string,
    @Body() updateQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.update(tenantId, id, updateQueueDto);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover fila' })
  @ApiResponse({ status: 200, description: 'Fila removida com sucesso' })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.remove(tenantId, id);
  }

  @Post(':id/call-next')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Chamar próximo da fila' })
  @ApiResponse({ status: 200, description: 'Próximo ticket chamado' })
  async callNext(
    @Param('tenantId') tenantId: string,
    @Param('id') queueId: string,
  ) {
    return this.queuesService.callNext(tenantId, queueId);
  }
}
