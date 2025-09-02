import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_TENANT_KEY } from '../decorators/require-tenant.decorator';

@Injectable()
export class TenantAuthGuard extends JwtAuthGuard {
  constructor(private readonly tenantReflector: Reflector) {
    super(tenantReflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.tenantReflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    const requireTenant = this.tenantReflector.getAllAndOverride<boolean>(
      REQUIRE_TENANT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    if (user.userType === 'client') {
      throw new ForbiddenException(
        'Clientes não podem acessar recursos de tenant',
      );
    }

    if (user.userType !== 'agent' && user.userType !== 'corporate_user') {
      throw new ForbiddenException('Tipo de usuário inválido');
    }

    if (!user.tenantId) {
      throw new ForbiddenException(
        'Usuário não está vinculado a nenhum tenant',
      );
    }

    if (requireTenant) {
      const tenantIdFromRoute =
        request.params.tenantId ||
        request.body.tenantId ||
        request.query.tenantId;

      if (!tenantIdFromRoute) {
        throw new ForbiddenException(
          'Tenant ID é obrigatório para esta operação',
        );
      }

      if (user.tenantId !== tenantIdFromRoute) {
        throw new ForbiddenException(
          'Acesso negado: você não tem permissão para acessar dados deste tenant',
        );
      }
    }

    // Para outros endpoints (tenants/:id, tickets/:id, etc.),
    // a validação de acesso será feita no service layer
    // O guard apenas verifica se o usuário é um agente/corporate_user válido com tenant

    return true;
  }
}
