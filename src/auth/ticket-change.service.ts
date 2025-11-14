import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangeTicketDto,
  ChangeTicketResponseDto,
} from '../common/dto/change-ticket.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class TicketChangeService {
  private readonly logger = new Logger(TicketChangeService.name);
  private readonly activeSessions = new Map<string, Set<string>>(); // userId -> Set<sessionId>

  constructor(private readonly prisma: PrismaService) {}

  async changeCorporateUserTicket(
    userId: string,
    changeTicketDto: ChangeTicketDto,
    sessionId: string,
  ): Promise<ChangeTicketResponseDto> {
    return this.changeTicket(
      'corporate_user',
      userId,
      changeTicketDto,
      sessionId,
    );
  }

  async changeAgentTicket(
    userId: string,
    changeTicketDto: ChangeTicketDto,
    sessionId: string,
  ): Promise<ChangeTicketResponseDto> {
    return this.changeTicket('agent', userId, changeTicketDto, sessionId);
  }

  async changeClientTicket(
    userId: string,
    changeTicketDto: ChangeTicketDto,
    sessionId: string,
  ): Promise<ChangeTicketResponseDto> {
    return this.changeTicket('client', userId, changeTicketDto, sessionId);
  }

  private async changeTicket(
    userType: 'corporate_user' | 'agent' | 'client',
    userId: string,
    changeTicketDto: ChangeTicketDto,
    sessionId: string,
  ): Promise<ChangeTicketResponseDto> {
    const { currentTicket, newTicket, confirmTicket } = changeTicketDto;

    // Validar se os tickets coincidem
    if (newTicket !== confirmTicket) {
      throw new BadRequestException('Novo ticket e confirmação não coincidem');
    }

    // Validar se o novo ticket é diferente do atual
    if (currentTicket === newTicket) {
      throw new BadRequestException(
        'O novo ticket deve ser diferente do ticket atual',
      );
    }

    // Buscar usuário baseado no tipo
    const user = await this.getUserByType(userType, userId);
    if (!user) {
      throw new NotFoundException('Usuário não encontrado');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Usuário inativo');
    }

    if (!user.password) {
      throw new BadRequestException('Usuário não possui ticket configurado');
    }

    // Verificar ticket atual
    const isCurrentTicketValid = await bcrypt.compare(
      currentTicket,
      user.password,
    );
    if (!isCurrentTicketValid) {
      this.logger.warn(
        `Tentativa de mudança de ticket com ticket incorreto para usuário ${userId}`,
      );
      throw new UnauthorizedException('Ticket atual incorreto');
    }

    // Hash do novo ticket
    const hashedNewTicket = await bcrypt.hash(newTicket, 10);

    // Atualizar ticket no banco
    await this.updateUserTicket(userType, userId, hashedNewTicket);

    // Contar sessões ativas que serão invalidadas
    const userSessions = this.activeSessions.get(userId) || new Set();
    const invalidatedSessionsCount = userSessions.size;

    // Invalidar sessões do usuário
    this.invalidateUserSessions(userId);

    this.logger.log(
      `Ticket alterado com sucesso para usuário ${userId} (${userType})`,
    );

    return {
      message: 'Ticket alterado com sucesso',
      changedAt: new Date().toISOString(),
      requiresReauth: true,
      invalidatedSessions: invalidatedSessionsCount,
    };
  }

  private async getUserByType(userType: string, userId: string): Promise<any> {
    switch (userType) {
      case 'corporate_user':
        return this.prisma.corporateUser.findUnique({
          where: { id: userId },
          select: {
            id: true,
            password: true,
            isActive: true,
            tenantId: true,
            email: true,
            name: true,
          },
        });
      case 'agent':
        return this.prisma.agent.findUnique({
          where: { id: userId },
          select: {
            id: true,
            password: true,
            isActive: true,
            tenantId: true,
            email: true,
            name: true,
          },
        });
      case 'client':
        return this.prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            password: true,
            isActive: true,
            email: true,
            name: true,
          },
        });
      default:
        throw new BadRequestException('Tipo de usuário inválido');
    }
  }

  private async updateUserTicket(
    userType: string,
    userId: string,
    hashedTicket: string,
  ): Promise<void> {
    const updateData = {
      password: hashedTicket,
      updatedAt: new Date(),
    };

    switch (userType) {
      case 'corporate_user':
        await this.prisma.corporateUser.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'agent':
        await this.prisma.agent.update({
          where: { id: userId },
          data: updateData,
        });
        break;
      case 'client':
        await this.prisma.user.update({
          where: { id: userId },
          data: updateData,
        });
        break;
    }
  }

  // Gerenciamento de sessões ativas
  registerSession(userId: string, sessionId: string): void {
    if (!this.activeSessions.has(userId)) {
      this.activeSessions.set(userId, new Set());
    }
    this.activeSessions.get(userId)!.add(sessionId);
  }

  unregisterSession(userId: string, sessionId: string): void {
    const userSessions = this.activeSessions.get(userId);
    if (userSessions) {
      userSessions.delete(sessionId);
      if (userSessions.size === 0) {
        this.activeSessions.delete(userId);
      }
    }
  }

  private async invalidateUserSessions(userId: string): Promise<void> {
    const userSessions = this.activeSessions.get(userId);
    if (userSessions) {
      // Notificar todas as sessões ativas via Igniter que devem ser invalidadas
      const invalidationData = {
        type: 'session-invalidated',
        userId,
        reason: 'ticket-changed',
        timestamp: new Date().toISOString(),
        requiresReauth: true,
        sessions: Array.from(userSessions),
      };

      // Notificação de invalidação de sessão (pode ser implementada no futuro)
      this.logger.debug(`Sessões invalidadas para usuário ${userId}`);

      // Limpar todas as sessões do usuário
      this.activeSessions.delete(userId);
    }
  }

  // Método para obter estatísticas de mudanças de ticket
  async getTicketChangeStats(tenantId?: string): Promise<{
    totalChangesToday: number;
    totalChangesThisWeek: number;
    totalChangesThisMonth: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    // Estas consultas são exemplos - ajustar baseado na estrutura real do banco
    // Pode ser necessário criar uma tabela de auditoria para mudanças de ticket

    return {
      totalChangesToday: 0, // Implementar consulta real
      totalChangesThisWeek: 0, // Implementar consulta real
      totalChangesThisMonth: 0, // Implementar consulta real
    };
  }
}
