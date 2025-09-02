import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import {
  AgentsService,
  CreateAgentDto,
  UpdateAgentDto,
} from './agents.service';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { CurrentAgent } from '../auth/decorators/current-agent.decorator';

@ApiTags('agents')
@Controller('tenants/:tenantId/agents')
@UseGuards(TenantAuthGuard)
@RequireTenant()
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo funcionário',
    description: 'Cria um novo funcionário no tenant (apenas administradores)',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({
    status: 201,
    description: 'Funcionário criado com sucesso',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - apenas administradores podem criar funcionários',
  })
  @ApiResponse({
    status: 409,
    description: 'Email, CPF ou Google ID já existe',
  })
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createAgentDto: CreateAgentDto,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.create(
      { ...createAgentDto, tenantId },
      currentAgentId,
    );
  }

  @Get()
  @ApiOperation({
    summary: 'Listar funcionários do tenant',
    description: 'Retorna lista de todos os funcionários do tenant',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Lista de funcionários',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findAll(
    @Param('tenantId') tenantId: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.findAll(tenantId, currentAgentId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar funcionário por ID',
    description: 'Retorna dados de um funcionário específico',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do funcionário' })
  @ApiResponse({
    status: 200,
    description: 'Dados do funcionário',
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.findOne(id, currentAgentId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Atualizar funcionário',
    description: 'Atualiza dados de um funcionário existente',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do funcionário' })
  @ApiResponse({
    status: 200,
    description: 'Funcionário atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - não pertence a este tenant ou não tem permissão',
  })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.update(id, updateAgentDto, currentAgentId);
  }

  @Put(':id/toggle-active')
  @ApiOperation({
    summary: 'Alternar status ativo do funcionário',
    description: 'Ativa ou desativa um funcionário',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do funcionário' })
  @ApiResponse({
    status: 200,
    description: 'Status alterado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - não pertence a este tenant ou não tem permissão',
  })
  async toggleActive(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.toggleActive(id, currentAgentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover funcionário',
    description: 'Remove um funcionário do sistema',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do funcionário' })
  @ApiResponse({
    status: 204,
    description: 'Funcionário removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado',
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - não pertence a este tenant ou não tem permissão',
  })
  async remove(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.remove(id, currentAgentId);
  }
}
