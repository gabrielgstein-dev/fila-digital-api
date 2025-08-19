import { Injectable } from '@nestjs/common';

@Injectable()
export class EventsService {
  constructor() {}

  emitQueueUpdate(queueId: string, data: any) {
    console.log('Queue updated:', queueId, data);
  }

  emitTicketUpdate(ticketId: string, data: any) {
    console.log('Ticket updated:', ticketId, data);
  }

  emitCallMade(queueId: string, data: any) {
    console.log('Call made:', queueId, data);
  }
}
