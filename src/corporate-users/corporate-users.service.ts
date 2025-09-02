import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorporateUserDto } from '../common/dto/create-corporate-user.dto';
import { UpdateCorporateUserDto } from '../common/dto/update-corporate-user.dto';
import { CorporateUserResponseDto } from '../common/dto/corporate-user-response.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CorporateUsersService {
  constructor(private readonly prisma: PrismaService) {}

  private canManageRole(
    currentUserRole: string,
    targetUserRole: string,
  ): boolean {
    const roleHierarchy = {
      OPERADOR: 1,
      GERENTE: 2,
      GESTOR: 3,
      ADMINISTRADOR: 4,
    };

    return roleHierarchy[currentUserRole] >= roleHierarchy[targetUserRole];
  }

  private canAccessResource(
    currentUserRole: string,
    resource: string,
  ): boolean {
    const rolePermissions = {
      OPERADOR: ['queues', 'tickets', 'counters'],
      GERENTE: ['queues', 'tickets', 'counters', 'corporate_users', 'reports'],
      GESTOR: [
        'queues',
        'tickets',
        'counters',
        'corporate_users',
        'reports',
        'tenants',
      ],
      ADMINISTRADOR: [
        'queues',
        'tickets',
        'counters',
        'corporate_users',
        'reports',
        'tenants',
        'system',
      ],
    };

    return rolePermissions[currentUserRole]?.includes(resource) || false;
  }

  async create(
    createCorporateUserDto: CreateCorporateUserDto,
    currentUserId: string,
  ): Promise<CorporateUserResponseDto> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!this.canManageRole(currentUser.role, createCorporateUserDto.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para criar usuários com este nível de acesso',
      );
    }

    if (currentUser.tenantId !== createCorporateUserDto.tenantId) {
      throw new ForbiddenException(
        'Não é possível criar usuários em outros tenants',
      );
    }

    const existingUser = await this.prisma.corporateUser.findFirst({
      where: {
        OR: [
          { email: createCorporateUserDto.email },
          { cpf: createCorporateUserDto.cpf },
          { googleId: createCorporateUserDto.googleId },
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email, CPF ou Google ID já existe');
    }

    const hashedPassword = createCorporateUserDto.password
      ? await bcrypt.hash(createCorporateUserDto.password, 10)
      : null;

    // Garantir que tenantId seja obrigatório
    if (!createCorporateUserDto.tenantId) {
      throw new Error('tenantId é obrigatório para criar usuário corporativo');
    }

    const corporateUser = await this.prisma.corporateUser.create({
      data: {
        ...createCorporateUserDto,
        password: hashedPassword,
        tenantId: createCorporateUserDto.tenantId, // Garantir que seja string
      },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return corporateUser as CorporateUserResponseDto;
  }

  async findAll(
    tenantId: string,
    currentUserId: string,
  ): Promise<CorporateUserResponseDto[]> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || currentUser.tenantId !== tenantId) {
      throw new ForbiddenException('Acesso negado a este tenant');
    }

    if (!this.canAccessResource(currentUser.role, 'corporate_users')) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar usuários',
      );
    }

    const users = await this.prisma.corporateUser.findMany({
      where: { tenantId },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return users as CorporateUserResponseDto[];
  }

  async findOne(
    id: string,
    currentUserId: string,
  ): Promise<CorporateUserResponseDto> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const user = await this.prisma.corporateUser.findUnique({
      where: { id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (user.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }

    if (!this.canAccessResource(currentUser.role, 'corporate_users')) {
      throw new ForbiddenException(
        'Você não tem permissão para visualizar usuários',
      );
    }

    return user as CorporateUserResponseDto;
  }

  async update(
    id: string,
    updateCorporateUserDto: UpdateCorporateUserDto,
    currentUserId: string,
  ): Promise<CorporateUserResponseDto> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const targetUser = await this.prisma.corporateUser.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (targetUser.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }

    if (targetUser.isProtected) {
      throw new ForbiddenException(
        'Não é possível modificar um usuário protegido',
      );
    }

    if (
      updateCorporateUserDto.role &&
      !this.canManageRole(currentUser.role, updateCorporateUserDto.role)
    ) {
      throw new ForbiddenException(
        'Você não tem permissão para promover usuários para este nível',
      );
    }

    const updateData: any = { ...updateCorporateUserDto };

    if (updateCorporateUserDto.password) {
      updateData.password = await bcrypt.hash(
        updateCorporateUserDto.password,
        10,
      );
    }

    const updatedUser = await this.prisma.corporateUser.update({
      where: { id },
      data: updateData,
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updatedUser as CorporateUserResponseDto;
  }

  async remove(id: string, currentUserId: string): Promise<void> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const targetUser = await this.prisma.corporateUser.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (targetUser.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }

    if (targetUser.isProtected) {
      throw new ForbiddenException(
        'Não é possível excluir um usuário protegido',
      );
    }

    if (targetUser.id === currentUser.id) {
      throw new ForbiddenException('Não é possível excluir a si mesmo');
    }

    if (!this.canManageRole(currentUser.role, targetUser.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para excluir usuários com este nível de acesso',
      );
    }

    await this.prisma.corporateUser.delete({
      where: { id },
    });
  }

  async toggleActive(
    id: string,
    currentUserId: string,
  ): Promise<CorporateUserResponseDto> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    const targetUser = await this.prisma.corporateUser.findUnique({
      where: { id },
    });

    if (!targetUser) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (targetUser.tenantId !== currentUser.tenantId) {
      throw new ForbiddenException('Acesso negado a este usuário');
    }

    if (targetUser.isProtected) {
      throw new ForbiddenException(
        'Não é possível modificar um usuário protegido',
      );
    }

    if (targetUser.id === currentUser.id) {
      throw new ForbiddenException('Não é possível desativar a si mesmo');
    }

    if (!this.canManageRole(currentUser.role, targetUser.role)) {
      throw new ForbiddenException(
        'Você não tem permissão para modificar usuários com este nível de acesso',
      );
    }

    const updatedUser = await this.prisma.corporateUser.update({
      where: { id },
      data: { isActive: !targetUser.isActive },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return updatedUser as CorporateUserResponseDto;
  }

  async checkPermission(
    userId: string,
    resource: string,
    action: string,
  ): Promise<boolean> {
    const user = await this.prisma.corporateUser.findUnique({
      where: { id: userId },
      include: { permissions: true },
    });

    if (!user || !user.isActive) {
      return false;
    }

    const specificPermission = user.permissions.find(
      (p) => p.resource === resource && p.action === action,
    );

    if (specificPermission !== undefined) {
      return specificPermission.granted;
    }

    return this.canAccessResource(user.role, resource);
  }

  async assignPermission(
    userId: string,
    resource: string,
    action: string,
    granted: boolean,
    currentUserId: string,
  ): Promise<void> {
    const currentUser = await this.prisma.corporateUser.findUnique({
      where: { id: currentUserId },
    });

    if (!currentUser || currentUser.role !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Apenas administradores podem gerenciar permissões',
      );
    }

    await this.prisma.corporateUserPermission.upsert({
      where: {
        corporateUserId_resource_action: {
          corporateUserId: userId,
          resource,
          action,
        },
      },
      update: { granted },
      create: {
        corporateUserId: userId,
        resource,
        action,
        granted,
      },
    });
  }
}

