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
import { TenantsService } from './tenants.service';
import { CreateTenantDto } from '../common/dto/create-tenant.dto';
import { UpdateTenantDto } from '../common/dto/update-tenant.dto';
import { TenantResponseDto } from '../common/dto/tenant-response.dto';
import { TenantAuthGuard } from '../auth/guards/tenant-auth.guard';
import { Public } from '../auth/decorators/public.decorator';

import { CurrentAgent } from '../auth/decorators/current-agent.decorator';

@ApiTags('tenants')
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Post()
  @Public()
  @ApiOperation({
    summary: 'Criar novo tenant',
    description: 'Cria uma nova empresa/estabelecimento no sistema',
  })
  @ApiResponse({
    status: 201,
    description: 'Tenant criado com sucesso',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'Slug ou email já existe',
  })
  async create(
    @Body() createTenantDto: CreateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.create(createTenantDto);
  }

  @Get()
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Listar todos os tenants',
    description:
      'Retorna lista de todos os tenants do sistema (apenas para administradores)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de tenants',
    type: [TenantResponseDto],
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - apenas administradores',
  })
  async findAll(
    @CurrentAgent('role') role: string,
  ): Promise<TenantResponseDto[]> {
    if (role !== 'ADMINISTRADOR') {
      throw new Error('Apenas administradores podem listar todos os tenants');
    }
    return this.tenantsService.findAll();
  }

  @Get('my-tenant')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar tenant atual do usuário',
    description: 'Retorna o tenant do agente autenticado',
  })
  @ApiResponse({
    status: 200,
    description: 'Tenant encontrado',
    type: TenantResponseDto,
  })
  async findMyTenant(
    @CurrentAgent('tenantId') tenantId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(tenantId);
  }

  @Get(':id')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Buscar tenant por ID',
    description:
      'Retorna um tenant específico pelo ID (apenas se pertencer ao tenant)',
  })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant encontrado',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async findOne(
    @Param('id') id: string,
    @CurrentAgent('tenantId') currentTenantId: string,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.findOne(id, currentTenantId);
  }

  @Get('slug/:slug')
  @Public()
  @ApiOperation({
    summary: 'Buscar tenant por slug',
    description: 'Retorna um tenant específico pelo slug',
  })
  @ApiParam({ name: 'slug', description: 'Slug do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant encontrado',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant não encontrado',
  })
  async findBySlug(@Param('slug') slug: string): Promise<TenantResponseDto> {
    return this.tenantsService.findBySlug(slug);
  }

  @Put(':id')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Atualizar tenant',
    description:
      'Atualiza dados de um tenant existente (apenas se pertencer ao tenant)',
  })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Tenant atualizado com sucesso',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant não encontrado',
  })
  @ApiResponse({
    status: 409,
    description: 'Slug ou email já existe',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async update(
    @Param('id') id: string,
    @Body() updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return this.tenantsService.update(id, updateTenantDto);
  }

  @Put(':id/toggle-active')
  @UseGuards(TenantAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Alternar status ativo do tenant',
    description: 'Ativa ou desativa um tenant (apenas se pertencer ao tenant)',
  })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({
    status: 200,
    description: 'Status alterado com sucesso',
    type: TenantResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async toggleActive(@Param('id') id: string): Promise<TenantResponseDto> {
    return this.tenantsService.toggleActive(id);
  }

  @Delete(':id')
  @UseGuards(TenantAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remover tenant',
    description: 'Remove um tenant do sistema (apenas se pertencer ao tenant)',
  })
  @ApiParam({ name: 'id', description: 'ID do tenant' })
  @ApiResponse({
    status: 204,
    description: 'Tenant removido com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Tenant não encontrado',
  })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado - não pertence a este tenant',
  })
  async remove(@Param('id') id: string): Promise<void> {
    return this.tenantsService.remove(id);
  }
}
