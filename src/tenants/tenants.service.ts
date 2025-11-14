import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { CreateTenantDto } from '../common/dto/create-tenant.dto';
import { TenantResponseDto } from '../common/dto/tenant-response.dto';
import { UpdateTenantDto } from '../common/dto/update-tenant.dto';
import { generateTemporaryPassword } from '../common/utils/password.utils';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTenantDto: CreateTenantDto): Promise<TenantResponseDto> {
    try {
      // Validação manual para email duplicado do tenant
      if (createTenantDto.email) {
        const existingTenant = await this.prisma.tenant.findFirst({
          where: { email: createTenantDto.email },
        });
        if (existingTenant) {
          throw new ConflictException('Já existe um tenant com este email');
        }
      }

      // Verificar se o email do administrador já existe
      const existingAdmin = await this.prisma.corporateUser.findUnique({
        where: { email: createTenantDto.adminEmail },
      });
      if (existingAdmin) {
        throw new ConflictException(
          'Já existe um usuário com este email de administrador',
        );
      }

      // Gerar senha temporária se não for informada
      let temporaryPassword: string | undefined;
      let passwordToHash = createTenantDto.adminPassword;

      if (!passwordToHash) {
        temporaryPassword = generateTemporaryPassword(12);
        passwordToHash = temporaryPassword;
      }

      // Hash da senha
      const hashedPassword = await bcrypt.hash(passwordToHash, 10);

      // Extrair nome do email se não for informado
      const adminName =
        createTenantDto.adminName ||
        createTenantDto.adminEmail.split('@')[0].replace(/[._-]/g, ' ');

      // Gerar CPF temporário único (11 dígitos aleatórios)
      let adminCpf: string;
      let cpfExists = true;
      while (cpfExists) {
        adminCpf = Math.floor(
          10000000000 + Math.random() * 90000000000,
        ).toString();
        const existingCpf = await this.prisma.corporateUser.findUnique({
          where: { cpf: adminCpf },
        });
        cpfExists = !!existingCpf;
      }

      // Criar tenant e administrador em uma transação
      const result = await this.prisma.$transaction(async (tx) => {
        // Criar tenant
        const tenant = await tx.tenant.create({
          data: {
            name: createTenantDto.name,
            slug: createTenantDto.slug,
            email: createTenantDto.email,
            phone: createTenantDto.phone,
          },
        });

        // Criar usuário administrador
        const adminUser = await tx.corporateUser.create({
          data: {
            email: createTenantDto.adminEmail,
            name: adminName,
            cpf: adminCpf,
            password: hashedPassword,
            role: 'ADMINISTRADOR',
            tenantId: tenant.id,
            isActive: true,
            isDefault: true,
            isProtected: true,
          },
        });

        return { tenant, adminUser };
      });

      // Preparar resposta
      const response: TenantResponseDto = {
        id: result.tenant.id,
        name: result.tenant.name,
        slug: result.tenant.slug,
        email: result.tenant.email,
        phone: result.tenant.phone,
        isActive: result.tenant.isActive,
        createdAt: result.tenant.createdAt,
        updatedAt: result.tenant.updatedAt,
        adminUser: {
          id: result.adminUser.id,
          email: result.adminUser.email,
          name: result.adminUser.name,
          role: result.adminUser.role,
        },
      };

      // Incluir senha temporária apenas se foi gerada
      if (temporaryPassword) {
        response.temporaryPassword = temporaryPassword;
      }

      return response;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('slug')) {
          throw new ConflictException('Já existe um tenant com este slug');
        }
        if (error.meta?.target?.includes('email')) {
          throw new ConflictException('Já existe um usuário com este email');
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

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      isActive: tenant.isActive,
      createdAt:
        tenant.createdAt instanceof Date
          ? tenant.createdAt
          : new Date(tenant.createdAt),
      updatedAt:
        tenant.updatedAt instanceof Date
          ? tenant.updatedAt
          : new Date(tenant.updatedAt),
    };
  }

  async findBySlug(slug: string): Promise<TenantResponseDto> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant não encontrado');
    }

    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      email: tenant.email,
      phone: tenant.phone,
      isActive: tenant.isActive,
      createdAt:
        tenant.createdAt instanceof Date
          ? tenant.createdAt
          : new Date(tenant.createdAt),
      updatedAt:
        tenant.updatedAt instanceof Date
          ? tenant.updatedAt
          : new Date(tenant.updatedAt),
    };
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
