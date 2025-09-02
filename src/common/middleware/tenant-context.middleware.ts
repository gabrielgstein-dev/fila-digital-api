import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

interface RequestWithTenant extends Request {
  tenantId?: string;
}

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  use(req: RequestWithTenant, res: Response, next: NextFunction) {
    const tenantId =
      req.params.tenantId || req.body.tenantId || req.query.tenantId;

    if (tenantId) {
      req.tenantId = tenantId;
    }

    next();
  }
}
