import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { QueueType } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: process.env.WEBSOCKET_CORS_ORIGIN || 'http://localhost:3000',
  },
})
export class EventsGateway {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  handleConnection(client: Socket) {
    this.logger.log(`Cliente conectado: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Cliente desconectado: ${client.id}`);
  }

  @SubscribeMessage('join-queue')
  handleJoinQueue(
    @MessageBody() data: { queueId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`queue-${data.queueId}`);
    this.logger.log(`Cliente ${client.id} entrou na fila ${data.queueId}`);
  }

  @SubscribeMessage('leave-queue')
  handleLeaveQueue(
    @MessageBody() data: { queueId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`queue-${data.queueId}`);
    this.logger.log(`Cliente ${client.id} saiu da fila ${data.queueId}`);
  }

  @SubscribeMessage('join-client')
  handleJoinClient(
    @MessageBody() data: { phone?: string; email?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const identifier = data.phone || data.email;
    if (identifier) {
      client.join(`client-${identifier}`);
      this.logger.log(
        `Cliente ${client.id} conectou com identificador ${identifier}`,
      );
    }
  }

  @SubscribeMessage('leave-client')
  handleLeaveClient(
    @MessageBody() data: { phone?: string; email?: string },
    @ConnectedSocket() client: Socket,
  ) {
    const identifier = data.phone || data.email;
    if (identifier) {
      client.leave(`client-${identifier}`);
      this.logger.log(
        `Cliente ${client.id} desconectou do identificador ${identifier}`,
      );
    }
  }

  @SubscribeMessage('join-tenant-current-calling-token')
  handleJoinTenantCurrentCallingToken(
    @MessageBody() data: { tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`tenant-${data.tenantId}`);
    this.logger.log(
      `Cliente ${client.id} entrou para receber atualizações de currentCallingToken do tenant ${data.tenantId}`,
    );
  }

  @SubscribeMessage('join-queue-type-current-calling-token')
  handleJoinQueueTypeCurrentCallingToken(
    @MessageBody() data: { queueType: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`queue-type-${data.queueType}`);
    this.logger.log(
      `Cliente ${client.id} entrou para receber atualizações de currentCallingToken do tipo de fila ${data.queueType}`,
    );
  }

  @SubscribeMessage('join-ticket')
  handleJoinTicket(
    @MessageBody() data: { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`ticket-${data.ticketId}`);
    this.logger.log(
      `Cliente ${client.id} entrou para receber atualizações do ticket ${data.ticketId}`,
    );
  }

  @SubscribeMessage('leave-ticket')
  handleLeaveTicket(
    @MessageBody() data: { ticketId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`ticket-${data.ticketId}`);
    this.logger.log(
      `Cliente ${client.id} saiu das atualizações do ticket ${data.ticketId}`,
    );
  }

  @SubscribeMessage('join-queue-client')
  handleJoinQueueClient(
    @MessageBody() data: { queueId: string; clientIdentifier?: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`queue-client-${data.queueId}`);
    if (data.clientIdentifier) {
      client.join(`client-${data.clientIdentifier}`);
    }
    this.logger.log(
      `Cliente ${client.id} entrou na fila ${data.queueId} para receber atualizações`,
    );
  }

  @SubscribeMessage('leave-queue-client')
  handleLeaveQueueClient(
    @MessageBody() data: { queueId: string; clientIdentifier?: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`queue-client-${data.queueId}`);
    if (data.clientIdentifier) {
      client.leave(`client-${data.clientIdentifier}`);
    }
    this.logger.log(`Cliente ${client.id} saiu da fila ${data.queueId}`);
  }

  @SubscribeMessage('leave-tenant-current-calling-token')
  handleLeaveTenantCurrentCallingToken(
    @MessageBody() data: { tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`tenant-${data.tenantId}`);
    this.logger.log(
      `Cliente ${client.id} saiu das atualizações de currentCallingToken do tenant ${data.tenantId}`,
    );
  }

  @SubscribeMessage('leave-queue-type-current-calling-token')
  handleLeaveQueueTypeCurrentCallingToken(
    @MessageBody() data: { queueType: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`queue-type-${data.queueType}`);
    this.logger.log(
      `Cliente ${client.id} saiu das atualizações de currentCallingToken do tipo de fila ${data.queueType}`,
    );
  }

  emitQueueUpdate(queueId: string, data: any) {
    this.server.to(`queue-${queueId}`).emit('queue-updated', data);
  }

  emitTicketUpdate(ticketId: string, data: any) {
    this.server.emit('ticket-updated', { ticketId, ...data });
  }

  emitCallMade(queueId: string, data: any) {
    this.server.to(`queue-${queueId}`).emit('call-made', data);
  }

  emitClientUpdate(clientIdentifier: string, data: any) {
    this.server.to(`client-${clientIdentifier}`).emit('client-update', data);
  }

  emitClientTicketCalled(clientIdentifier: string, data: any) {
    this.server.to(`client-${clientIdentifier}`).emit('ticket-called', data);
  }

  emitCurrentCallingTokenUpdate(
    tenantId: string,
    queueType: QueueType,
    data: any,
  ) {
    this.server
      .to(`tenant-${tenantId}`)
      .to(`queue-type-${queueType}`)
      .emit('current-calling-token-updated', data);
  }

  emitTicketCalledToClient(ticketId: string, data: any) {
    this.server.to(`ticket-${ticketId}`).emit('ticket-called', data);
  }

  emitQueueStatusToClients(queueId: string, data: any) {
    this.server
      .to(`queue-client-${queueId}`)
      .emit('queue-status-updated', data);
  }

  emitTicketStatusToClient(ticketId: string, data: any) {
    this.server.to(`ticket-${ticketId}`).emit('ticket-status-updated', data);
  }

  // Métodos para notificações de mudança de ticket
  emitTicketChangeToUser(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('ticket-changed', data);
    this.logger.log(`Ticket change notification sent to user ${userId}`);
  }

  emitSessionInvalidationToUser(userId: string, data: any) {
    this.server.to(`user-${userId}`).emit('session-invalidated', data);
    this.logger.log(`Session invalidation notification sent to user ${userId}`);
  }

  emitSecurityAlertToTenant(tenantId: string, data: any) {
    this.server.to(`tenant-admins-${tenantId}`).emit('security-alert', data);
    this.logger.log(`Security alert sent to tenant ${tenantId} admins`);
  }

  // Método para usuário entrar em salas específicas
  @SubscribeMessage('join-user-room')
  handleJoinUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.join(`user-${data.userId}`);
    this.logger.log(
      `Cliente ${client.id} entrou na sala do usuário ${data.userId}`,
    );
    client.emit('joined-user-room', { userId: data.userId });
  }

  @SubscribeMessage('leave-user-room')
  handleLeaveUserRoom(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    client.leave(`user-${data.userId}`);
    this.logger.log(
      `Cliente ${client.id} saiu da sala do usuário ${data.userId}`,
    );
    client.emit('left-user-room', { userId: data.userId });
  }

  @SubscribeMessage('join-tenant-admins')
  handleJoinTenantAdmins(
    @MessageBody() data: { tenantId: string; userRole: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Verificar se o usuário tem permissão de administrador
    if (['ADMINISTRADOR', 'GESTOR'].includes(data.userRole)) {
      client.join(`tenant-admins-${data.tenantId}`);
      this.logger.log(
        `Admin ${client.id} entrou na sala de admins do tenant ${data.tenantId}`,
      );
      client.emit('joined-tenant-admins', { tenantId: data.tenantId });
    } else {
      client.emit('error', {
        message: 'Acesso negado - permissões insuficientes',
      });
    }
  }
}
