import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class TenantFilterInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    return next.handle().pipe(
      map((data) => {
        if (!user || user.userType !== 'agent' || !user.tenantId) {
          return data;
        }

        if (Array.isArray(data)) {
          return data.filter((item) => {
            if (item.tenantId) {
              return item.tenantId === user.tenantId;
            }
            if (item.tenant && item.tenant.id) {
              return item.tenant.id === user.tenantId;
            }
            return true;
          });
        }

        if (data && typeof data === 'object') {
          if (data.tenantId && data.tenantId !== user.tenantId) {
            return null;
          }
          if (
            data.tenant &&
            data.tenant.id &&
            data.tenant.id !== user.tenantId
          ) {
            return null;
          }
        }

        return data;
      }),
    );
  }
}

