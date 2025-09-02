import { Injectable } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { TicketStatus, QueueType } from '@prisma/client';

@Injectable()
export class EventsService {
  constructor(private readonly eventsGateway: EventsGateway) {}

  emitQueueUpdate(queueId: string, data: any) {
    this.eventsGateway.emitQueueUpdate(queueId, data);
  }

  emitTicketUpdate(ticketId: string, data: any) {
    this.eventsGateway.emitTicketUpdate(ticketId, data);
  }

  emitCallMade(queueId: string, data: any) {
    this.eventsGateway.emitCallMade(queueId, data);
  }

  emitTicketCalled(queueId: string, ticketData: any) {
    this.eventsGateway.emitCallMade(queueId, {
      type: 'ticket-called',
      ticket: ticketData,
      timestamp: new Date(),
    });
  }

  emitTicketStatusChanged(
    ticketId: string,
    oldStatus: TicketStatus,
    newStatus: TicketStatus,
    data: any,
  ) {
    this.eventsGateway.emitTicketUpdate(ticketId, {
      type: 'status-changed',
      oldStatus,
      newStatus,
      ...data,
      timestamp: new Date(),
    });
  }

  emitQueueStatusUpdate(queueId: string, data: any) {
    this.eventsGateway.emitQueueUpdate(queueId, {
      type: 'status-update',
      ...data,
      timestamp: new Date(),
    });
  }

  emitClientNotification(clientIdentifier: string, data: any) {
    this.eventsGateway.emitClientUpdate(clientIdentifier, data);
  }

  emitCurrentCallingTokenUpdate(
    tenantId: string,
    queueType: QueueType,
    data: any,
  ) {
    this.eventsGateway.emitCurrentCallingTokenUpdate(tenantId, queueType, data);
  }
}
