import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
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
import { CurrentCorporateUser } from '../auth/decorators/current-corporate-user.decorator';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { CreateCorporateUserDto } from '../common/dto/create-corporate-user.dto';
import { UpdateCorporateUserDto } from '../common/dto/update-corporate-user.dto';
import { CorporateUsersService } from './corporate-users.service';

@ApiTags('corporate-users')
@Controller('tenants/:tenantId/corporate-users')
@UseGuards(TenantAuthGuard)
@RequireTenant()
@ApiBearerAuth()
export class CorporateUsersController {
  constructor(private readonly corporateUsersService: CorporateUsersService) {}

  @Post()
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiOperation({
    summary: 'Criar novo usuário corporativo',
    description:
      'Cria um novo usuário corporativo no tenant especificado. Usuários corporativos são gerentes e administradores que gerenciam o sistema. Use este endpoint quando precisar cadastrar um novo usuário corporativo (gerente, administrador) no tenant.',
  })
  @ApiBody({ type: CreateCorporateUserDto })
  @ApiResponse({
    status: 201,
    description:
      'Usuário corporativo criado com sucesso. Retorna os dados completos do usuário criado.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174030',
        name: 'Pedro Oliveira',
        email: 'pedro@empresa.com',
        cpf: '11122233344',
        role: 'ADMINISTRADOR',
        isActive: true,
        tenantId: '123e4567-e89b-12d3-a456-426614174000',
        createdAt: '2024-01-15T16:00:00.000Z',
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou CPF já existe no sistema.',
    schema: {
      type: 'object',
      example: {
        statusCode: 409,
        message: 'Email já cadastrado',
        error: 'Conflict',
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
  async create(
    @Param('tenantId') tenantId: string,
    @Body() createCorporateUserDto: CreateCorporateUserDto,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    // Garantir que o tenantId da URL seja usado
    const dataWithTenantId = {
      ...createCorporateUserDto,
      tenantId, // Sempre usar o tenantId da URL
    };

    return this.corporateUsersService.create(dataWithTenantId, currentUserId);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar usuários corporativos do tenant',
    description: 'Retorna lista de todos os usuários corporativos do tenant',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Lista de usuários corporativos',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findAll(
    @Param('tenantId') tenantId: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.findAll(tenantId, currentUserId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Buscar usuário corporativo por ID',
    description: 'Retorna dados de um usuário corporativo específico',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiResponse({
    status: 200,
    description: 'Dados do usuário corporativo',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.findOne(id, currentUserId);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Atualizar usuário corporativo',
    description: 'Atualiza dados de um usuário corporativo existente',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiResponse({
    status: 200,
    description: 'Usuário corporativo atualizado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async update(
    @Param('id') id: string,
    @Body() updateCorporateUserDto: UpdateCorporateUserDto,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.update(
      id,
      updateCorporateUserDto,
      currentUserId,
    );
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Remover usuário corporativo',
    description: 'Remove um usuário corporativo do sistema',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiResponse({
    status: 200,
    description: 'Usuário corporativo removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async remove(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.remove(id, currentUserId);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({
    summary: 'Alternar status ativo do usuário corporativo',
    description: 'Ativa ou desativa um usuário corporativo',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiResponse({
    status: 200,
    description: 'Status alterado com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async toggleActive(
    @Param('id') id: string,
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.toggleActive(id, currentUserId);
  }

  @Patch(':id/permissions')
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário corporativo',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  @ApiOperation({
    summary: 'Atribuir/remover permissão do usuário',
    description:
      'Atribui ou remove uma permissão específica de um usuário corporativo. Use este endpoint para gerenciar permissões granulares de usuários corporativos, permitindo ou negando acesso a recursos específicos (filas, relatórios, configurações, etc.) e ações (criar, ler, atualizar, deletar).',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['resource', 'action', 'granted'],
      properties: {
        resource: {
          type: 'string',
          description: 'Recurso da permissão (ex: queues, reports, settings)',
          example: 'queues',
        },
        action: {
          type: 'string',
          description: 'Ação da permissão (ex: create, read, update, delete)',
          example: 'create',
        },
        granted: {
          type: 'boolean',
          description: 'true para conceder, false para remover',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description:
      'Permissão atualizada com sucesso. Retorna os dados atualizados do usuário.',
    schema: {
      type: 'object',
      example: {
        id: '123e4567-e89b-12d3-a456-426614174030',
        permissions: [
          {
            resource: 'queues',
            action: 'create',
            granted: true,
          },
        ],
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Usuário corporativo não encontrado',
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
  async assignPermission(
    @Param('id') id: string,
    @Body()
    permissionData: {
      resource: string;
      action: string;
      granted: boolean;
    },
    @CurrentCorporateUser('id') currentUserId: string,
  ) {
    return this.corporateUsersService.assignPermission(
      id,
      permissionData.resource,
      permissionData.action,
      permissionData.granted,
      currentUserId,
    );
  }

  @Get(':id/permissions/:resource/:action')
  @ApiParam({
    name: 'tenantId',
    description: 'ID do tenant',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiParam({
    name: 'id',
    description: 'ID do usuário corporativo',
    example: '123e4567-e89b-12d3-a456-426614174030',
  })
  @ApiParam({
    name: 'resource',
    description: 'Recurso da permissão (ex: queues, reports, settings)',
    example: 'queues',
  })
  @ApiParam({
    name: 'action',
    description: 'Ação da permissão (ex: create, read, update, delete)',
    example: 'create',
  })
  @ApiOperation({
    summary: 'Verificar permissão do usuário',
    description:
      'Verifica se um usuário corporativo tem uma permissão específica para um recurso e ação. Use este endpoint para verificar programaticamente se um usuário tem determinada permissão antes de executar uma ação.',
  })
  @ApiResponse({
    status: 200,
    description:
      'Status da permissão retornado com sucesso. Retorna boolean indicando se o usuário tem a permissão.',
    schema: {
      type: 'object',
      example: {
        hasPermission: true,
        resource: 'queues',
        action: 'create',
        userId: '123e4567-e89b-12d3-a456-426614174030',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado.',
    schema: {
      type: 'object',
      example: {
        statusCode: 404,
        message: 'Usuário corporativo não encontrado',
        error: 'Not Found',
      },
    },
  })
  async checkPermission(
    @Param('id') id: string,
    @Param('resource') resource: string,
    @Param('action') action: string,
  ) {
    const hasPermission = await this.corporateUsersService.checkPermission(
      id,
      resource,
      action,
    );
    return { hasPermission };
  }
}
