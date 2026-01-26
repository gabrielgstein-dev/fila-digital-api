import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentAgent } from '../auth/decorators/current-agent.decorator';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { AgentsService } from './agents.service';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentDto } from './dto/update-agent.dto';

@ApiTags('agents')
@Controller('tenants/:tenantId/agents')
@UseGuards(TenantAuthGuard)
@RequireTenant()
@ApiBearerAuth()
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Criar novo funcionário',
    description:
      'Cria um novo funcionário (atendente ou gestor) no tenant especificado. Apenas administradores podem criar funcionários. Use este endpoint quando precisar cadastrar um novo funcionário no sistema. O funcionário pode ser criado com CPF, email, ou Google ID.',
  })
  @ApiBody({ type: CreateAgentDto })
  @ApiResponse({
    status: 201,
    description:
      'Funcionário criado com sucesso. Retorna os dados completos do funcionário criado.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174025',
        name: 'João Silva',
        cpf: '12345678900',
        email: 'joao@empresa.com',
        role: 'ATENDENTE',
        isActive: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - apenas administradores podem criar funcionários.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message:
          'Acesso negado - apenas administradores podem criar funcionários',
        error: 'Forbidden',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email, CPF ou Google ID já existe no sistema.',
    schema: {
      type: 'object',
      example: {
        statusCode: 409,
        message: 'Email já cadastrado',
        error: 'Conflict',
      },
    },
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
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Listar funcionários do tenant',
    description:
      'Retorna lista completa de todos os funcionários (atendentes e gestores) do tenant. Use este endpoint para obter uma visão geral de todos os funcionários cadastrados no sistema do tenant, incluindo status ativo/inativo e funções.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Lista de funcionários retornada com sucesso. Retorna array com dados completos de cada funcionário.',
    schema: {
      type: 'array',
      example: [
        {
          id: '123e4567-e89b-12d3-a456-426614174025',
          name: 'João Silva',
          cpf: '12345678900',
          email: 'joao@empresa.com',
          role: 'ATENDENTE',
          isActive: true,
          createdAt: '2024-01-15T16:00:00.000Z',
        },
        {
          id: '123e4567-e89b-12d3-a456-426614174026',
          name: 'Maria Santos',
          cpf: '98765432100',
          email: 'maria@empresa.com',
          role: 'GESTOR',
          isActive: true,
          createdAt: '2024-01-14T10:00:00.000Z',
        },
      ],
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async findAll(
    @Param('tenantId') tenantId: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.findAll(tenantId, currentAgentId);
  }

  @Get(':id')
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do funcionário',
    example: '123e4567-e89b-12d3-a456-426614174025',
  })
  @ApiOperation({
    summary: 'Buscar funcionário por ID',
    description:
      'Retorna dados detalhados de um funcionário específico pelo ID. Use este endpoint quando precisar visualizar informações completas de um funcionário, incluindo dados pessoais, função, status e histórico.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Dados do funcionário retornados com sucesso. Retorna objeto com informações completas do funcionário.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174025',
        name: 'João Silva',
        cpf: '12345678900',
        email: 'joao@empresa.com',
        role: 'ATENDENTE',
        isActive: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-15T16:00:00.000Z',
        updatedAt: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Funcionário não encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - usuário não pertence a este tenant.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.findOne(id, currentAgentId);
  }

  @Put(':id')
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do funcionário',
    example: '123e4567-e89b-12d3-a456-426614174025',
  })
  @ApiOperation({
    summary: 'Atualizar funcionário',
    description:
      'Atualiza dados de um funcionário existente. Permite modificar nome, email, CPF, função e outros dados pessoais. Use este endpoint quando precisar atualizar informações de um funcionário cadastrado.',
  })
  @ApiBody({ type: UpdateAgentDto })
  @ApiResponse({
    status: 200,
    description:
      'Funcionário atualizado com sucesso. Retorna os dados atualizados do funcionário.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174025',
        name: 'João Silva Atualizado',
        email: 'joao.novo@empresa.com',
        role: 'ATENDENTE',
        updatedAt: '2024-01-15T17:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Funcionário não encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async update(
    @Param('id') id: string,
    @Body() updateAgentDto: UpdateAgentDto,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.update(id, updateAgentDto, currentAgentId);
  }

  @Put(':id/toggle-active')
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do funcionário',
    example: '123e4567-e89b-12d3-a456-426614174025',
  })
  @ApiOperation({
    summary: 'Alternar status ativo do funcionário',
    description:
      'Ativa ou desativa um funcionário. Um funcionário desativado não pode fazer login no sistema. Use este endpoint quando um funcionário sair da empresa, estiver de férias ou temporariamente indisponível.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Status alterado com sucesso. Retorna os dados atualizados do funcionário.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174025',
        name: 'João Silva',
        isActive: false,
        updatedAt: '2024-01-15T17:30:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Funcionário não encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async toggleActive(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.toggleActive(id, currentAgentId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do funcionário',
    example: '123e4567-e89b-12d3-a456-426614174025',
  })
  @ApiOperation({
    summary: 'Remover funcionário',
    description:
      'Remove permanentemente um funcionário do sistema. Esta ação é irreversível. Use este endpoint com cuidado, apenas quando realmente precisar deletar um funcionário. Recomenda-se usar toggle-active para desativar em vez de remover.',
  })
  @ApiResponse({
    status: 204,
    description:
      'Funcionário removido com sucesso. Nenhum conteúdo é retornado.',
  })
  @ApiResponse({
    status: 404,
    description: 'Funcionário não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Funcionário não encontrado',
        error: 'Not Found',
      },
    },
  })
  @ApiResponse({
    status: 403,
    description:
      'Acesso negado - usuário não pertence a este tenant ou não tem permissão.',
    schema: {
      type: 'object',
      example: {
        statusCode: 403,
        message: 'Acesso negado',
        error: 'Forbidden',
      },
    },
  })
  async remove(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.remove(id, currentAgentId);
  }

  @Put(':id/status')
  @ApiParam({
    name: 'id',
    description: 'ID do agente',
  })
  @ApiOperation({
    summary: 'Atualizar status do agente',
    description: 'Atualiza o status de disponibilidade do agente (AVAILABLE, BUSY, ON_BREAK, etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Status atualizado com sucesso',
  })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: { status: string },
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.updateStatus(id, updateStatusDto.status, currentAgentId);
  }

  @Get(':id/stats')
  @ApiParam({
    name: 'id',
    description: 'ID do agente',
  })
  @ApiOperation({
    summary: 'Obter estatísticas do agente',
    description: 'Retorna estatísticas de atendimento do agente incluindo ticket atual',
  })
  @ApiResponse({
    status: 200,
    description: 'Estatísticas do agente',
  })
  async getStats(
    @Param('id') id: string,
    @CurrentAgent('id') currentAgentId: string,
  ) {
    return this.agentsService.getAgentStats(id, currentAgentId);
  }

}
