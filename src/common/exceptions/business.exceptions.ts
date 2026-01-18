import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';
import { ERROR_MESSAGES } from '../constants/error-messages.constants';

export class QueueNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.QUEUE_NOT_FOUND);
  }
}

export class QueueInactiveException extends BadRequestException {
  constructor() {
    super(ERROR_MESSAGES.QUEUE_INACTIVE);
  }
}

export class QueueFullException extends BadRequestException {
  constructor() {
    super(ERROR_MESSAGES.QUEUE_FULL);
  }
}

export class TicketNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.TICKET_NOT_FOUND);
  }
}

export class TicketAlreadyCalledException extends BadRequestException {
  constructor() {
    super(ERROR_MESSAGES.TICKET_ALREADY_CALLED);
  }
}

export class TicketAlreadyCompletedException extends BadRequestException {
  constructor() {
    super(ERROR_MESSAGES.TICKET_ALREADY_COMPLETED);
  }
}

export class TenantNotFoundException extends NotFoundException {
  constructor() {
    super(ERROR_MESSAGES.TENANT_NOT_FOUND);
  }
}

export class TenantInactiveException extends ForbiddenException {
  constructor() {
    super(ERROR_MESSAGES.TENANT_INACTIVE);
  }
}

export class UnauthorizedAccessException extends ForbiddenException {
  constructor() {
    super(ERROR_MESSAGES.UNAUTHORIZED_ACCESS);
  }
}

export class CapacityExceededException extends BadRequestException {
  constructor() {
    super(ERROR_MESSAGES.CAPACITY_EXCEEDED);
  }
}
