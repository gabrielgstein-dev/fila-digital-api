import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTenantDto } from '../common/dto/create-tenant.dto';
import { UpdateTenantDto } from '../common/dto/update-tenant.dto';
import { TenantResponseDto } from '../common/dto/tenant-response.dto';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    try {
      // Validação manual para email duplicado
      if (createTenantDto.email) {
        const existingTenant = await this.prisma.tenant.findFirst({
          where: { email: createTenantDto.email },
        });
        if (existingTenant) {
          throw new ConflictException('Já existe um tenant com este email');
        }
      }

      const tenant = await this.prisma.tenant.create({
        data: createTenantDto,
      });

      return tenant;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('slug')) {
          throw new ConflictException('Já existe um tenant com este slug');
        }
      }
      throw error;
    }
  }

  async findAll(): Promise<TenantResponseDto[]> {
    const tenants = await this.prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return tenants;
  }

  async findOne(
    id: string,
    currentTenantId?: string,
  ): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    // Se currentTenantId for fornecido, validar acesso
    if (currentTenantId && tenant.id !== currentTenantId) {
      throw new ForbiddenException(
        'Acesso negado - não pertence a este tenant',
      );
    }

    return tenant;
  }

  async findBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return tenant;
  }

  async update(
    id: string,
    updateTenantDto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    try {
      // Validação manual para email duplicado
      if (updateTenantDto.email) {
        const existingTenant = await this.prisma.tenant.findFirst({
          where: {
            email: updateTenantDto.email,
            id: { not: id }, // Excluir o tenant atual da verificação
          },
        });
        if (existingTenant) {
          throw new ConflictException('Já existe um tenant com este email');
        }
      }

      const tenant = await this.prisma.tenant.update({
        where: { id },
        data: updateTenantDto,
      });

      return tenant;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException('Tenant não encontrado');
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('slug')) {
          throw new ConflictException('Já existe um tenant com este slug');
        }
      }
      throw error;
    }
  }

  async remove(id: string): Promise<void> {
    try {
      await this.prisma.tenant.delete({
        where: { id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('Tenant não encontrado');
      }
      throw error;
    }
  }

  async toggleActive(id: string): Promise<TenantResponseDto> {
    const tenant = await this.findOne(id);

    const updatedTenant = await this.prisma.tenant.update({
      where: { id },
      data: { isActive: !tenant.isActive },
    });

    return updatedTenant;
  }
}
