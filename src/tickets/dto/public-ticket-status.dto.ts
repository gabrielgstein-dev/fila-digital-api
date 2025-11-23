export class PublicTicketStatusDto {
  status: string;
  queueName: string;
  myCallingToken: string;
  position: number | null;
  estimatedWaitTime: number | null;
}
