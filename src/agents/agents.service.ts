import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';

export interface CreateAgentDto {
  email: string;
  name: string;
  password?: string;
  googleId?: string;
  role: 'OPERADOR' | 'GERENTE' | 'GESTOR' | 'ADMINISTRADOR';
  tenantId: string;
  cpf: string;
}

export interface UpdateAgentDto {
  email?: string;
  name?: string;
  password?: string;
  role?: 'OPERADOR' | 'GERENTE' | 'GESTOR' | 'ADMINISTRADOR';
  isActive?: boolean;
}

@Injectable()
export class AgentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createAgentDto: CreateAgentDto, currentAgentId: string) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    // Apenas administradores podem criar agentes
    if (currentAgent.role !== 'ADMINISTRADOR') {
      throw new ForbiddenException(
        'Apenas administradores podem criar funcionários',
      );
    }

    if (
      currentAgent.role !== 'ADMINISTRADOR' &&
      createAgentDto.role === 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'Apenas administradores podem criar outros administradores',
      );
    }

    if (currentAgent.tenantId !== createAgentDto.tenantId) {
      throw new ForbiddenException(
        'Não é possível criar agentes em outros tenants',
      );
    }

    const existingAgent = await this.prisma.agent.findFirst({
      where: {
        OR: [
          { email: createAgentDto.email },
          { cpf: createAgentDto.cpf },
          { googleId: createAgentDto.googleId },
        ],
      },
    });

    if (existingAgent) {
      throw new ConflictException('Email, CPF ou Google ID já existe');
    }

    const hashedPassword = createAgentDto.password
      ? await bcrypt.hash(createAgentDto.password, 10)
      : null;

    return this.prisma.agent.create({
      data: {
        ...createAgentDto,
        password: hashedPassword,
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
  }

  async findAll(tenantId: string, currentAgentId: string) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent || currentAgent.tenantId !== tenantId) {
      throw new ForbiddenException('Acesso negado a este tenant');
    }

    return this.prisma.agent.findMany({
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
  }

  async findOne(id: string, currentAgentId: string) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    const agent = await this.prisma.agent.findUnique({
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

    if (!agent) {
      throw new NotFoundException('Agente não encontrado');
    }

    if (agent.tenantId !== currentAgent.tenantId) {
      throw new ForbiddenException('Acesso negado a este agente');
    }

    return agent;
  }

  async update(
    id: string,
    updateAgentDto: UpdateAgentDto,
    currentAgentId: string,
  ) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    const targetAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!targetAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    if (targetAgent.tenantId !== currentAgent.tenantId) {
      throw new ForbiddenException('Acesso negado a este agente');
    }

    if (targetAgent.isProtected) {
      throw new ForbiddenException(
        'Não é possível modificar um agente protegido',
      );
    }

    if (
      updateAgentDto.role === 'ADMINISTRADOR' &&
      currentAgent.role !== 'ADMINISTRADOR'
    ) {
      throw new ForbiddenException(
        'Apenas administradores podem promover outros administradores',
      );
    }

    const updateData: any = { ...updateAgentDto };

    if (updateAgentDto.password) {
      updateData.password = await bcrypt.hash(updateAgentDto.password, 10);
    }

    return this.prisma.agent.update({
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
  }

  async remove(id: string, currentAgentId: string) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    const targetAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!targetAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    if (targetAgent.tenantId !== currentAgent.tenantId) {
      throw new ForbiddenException('Acesso negado a este agente');
    }

    if (targetAgent.isProtected) {
      throw new ForbiddenException(
        'Não é possível excluir um agente protegido',
      );
    }

    if (targetAgent.id === currentAgent.id) {
      throw new ForbiddenException('Não é possível excluir a si mesmo');
    }

    return this.prisma.agent.delete({
      where: { id },
    });
  }

  async toggleActive(id: string, currentAgentId: string) {
    const currentAgent = await this.prisma.agent.findUnique({
      where: { id: currentAgentId },
    });

    if (!currentAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    const targetAgent = await this.prisma.agent.findUnique({
      where: { id },
    });

    if (!targetAgent) {
      throw new NotFoundException('Agente não encontrado');
    }

    if (targetAgent.tenantId !== currentAgent.tenantId) {
      throw new ForbiddenException('Acesso negado a este agente');
    }

    if (targetAgent.isProtected) {
      throw new ForbiddenException(
        'Não é possível modificar um agente protegido',
      );
    }

    if (targetAgent.id === currentAgent.id) {
      throw new ForbiddenException('Não é possível desativar a si mesmo');
    }

    return this.prisma.agent.update({
      where: { id },
      data: { isActive: !targetAgent.isActive },
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
  }
}
