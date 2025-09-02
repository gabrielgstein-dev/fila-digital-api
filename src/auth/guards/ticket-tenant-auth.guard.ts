import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TicketTenantAuthGuard extends JwtAuthGuard {
  constructor(
    private ticketReflector: Reflector,
    private prisma: PrismaService,
  ) {
    super(ticketReflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Primeiro valida JWT
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const ticketId = request.params.id;

    if (!ticketId) {
      throw new ForbiddenException('ID do ticket não fornecido');
    }

    // Verificar se o usuário é um agente (tem tenantId)
    if (!user.tenantId) {
      throw new ForbiddenException(
        'Acesso negado: apenas agentes podem modificar tickets',
      );
    }

    // Buscar o ticket para obter o tenantId
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        queue: {
          include: {
            tenant: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket não encontrado');
    }

    const ticketTenantId = ticket.queue.tenantId;

    // Verificar se o agente pertence ao tenant do ticket
    if (user.tenantId !== ticketTenantId) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para modificar tickets deste tenant',
      );
    }

    return true;
  }
}
