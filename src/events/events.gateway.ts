import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

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

  emitQueueUpdate(queueId: string, data: any) {
    this.server.to(`queue-${queueId}`).emit('queue-updated', data);
  }

  emitTicketUpdate(ticketId: string, data: any) {
    this.server.emit('ticket-updated', { ticketId, ...data });
  }

  emitCallMade(queueId: string, data: any) {
    this.server.to(`queue-${queueId}`).emit('call-made', data);
  }
}
