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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('queues')
@Controller('tenants/:tenantId/queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Criar nova fila' })
  @ApiResponse({ status: 201, description: 'Fila criada com sucesso' })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createQueueDto: CreateQueueDto,
  ) {
    return this.queuesService.create(tenantId, createQueueDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar filas do tenant' })
  @ApiResponse({ status: 200, description: 'Lista de filas' })
  async findAll(@Param('tenantId') tenantId: string) {
    return this.queuesService.findAll(tenantId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar fila por ID' })
  @ApiResponse({ status: 200, description: 'Dados da fila' })
  async findOne(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.findOne(tenantId, id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remover fila' })
  @ApiResponse({ status: 200, description: 'Fila removida com sucesso' })
  async remove(@Param('tenantId') tenantId: string, @Param('id') id: string) {
    return this.queuesService.remove(tenantId, id);
  }

  @Post(':id/call-next')
  @UseGuards(JwtAuthGuard)
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
