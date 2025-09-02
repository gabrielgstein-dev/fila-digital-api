import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CorporateUsersService } from './corporate-users.service';
import { CreateCorporateUserDto } from '../common/dto/create-corporate-user.dto';
import { UpdateCorporateUserDto } from '../common/dto/update-corporate-user.dto';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { RequireTenant } from '../auth/decorators/require-tenant.decorator';
import { CurrentCorporateUser } from '../auth/decorators/current-corporate-user.decorator';

@ApiTags('corporate-users')
@Controller('tenants/:tenantId/corporate-users')
@UseGuards(TenantAuthGuard)
@RequireTenant()
@ApiBearerAuth()
export class CorporateUsersController {
  constructor(private readonly corporateUsersService: CorporateUsersService) {}

  @Post()
  @ApiOperation({
    summary: 'Criar novo usuário corporativo',
    description: 'Cria um novo usuário corporativo no tenant especificado',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiResponse({
    status: 201,
    description: 'Usuário corporativo criado com sucesso',
  })
  @ApiResponse({
    status: 409,
    description: 'Email ou CPF já existe',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
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
  @ApiOperation({
    summary: 'Atribuir/remover permissão do usuário',
    description:
      'Atribui ou remove uma permissão específica de um usuário corporativo',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiResponse({
    status: 200,
    description: 'Permissão atualizada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
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
  @ApiOperation({
    summary: 'Verificar permissão do usuário',
    description:
      'Verifica se um usuário corporativo tem uma permissão específica',
  })
  @ApiParam({ name: 'tenantId', description: 'ID do tenant' })
  @ApiParam({ name: 'id', description: 'ID do usuário corporativo' })
  @ApiParam({ name: 'resource', description: 'Recurso da permissão' })
  @ApiParam({ name: 'action', description: 'Ação da permissão' })
  @ApiResponse({
    status: 200,
    description: 'Status da permissão',
    schema: {
      type: 'object',
      properties: {
        hasPermission: {
          type: 'boolean',
          description: 'Se o usuário tem a permissão',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Usuário corporativo não encontrado',
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
