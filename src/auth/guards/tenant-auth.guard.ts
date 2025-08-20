import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class TenantAuthGuard extends JwtAuthGuard {
  constructor(private tenantReflector: Reflector) {
    super(tenantReflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verifica se a rota é pública
    const isPublic = this.tenantReflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    // Primeiro valida JWT
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const tenantIdFromRoute = request.params.tenantId;

    // Se não há tenantId na rota, permite (para rotas que não são específicas de tenant)
    if (!tenantIdFromRoute) {
      return true;
    }

    // Valida se o usuário pertence ao tenant da rota
    if (user.tenantId !== tenantIdFromRoute) {
      throw new ForbiddenException(
        'Acesso negado: você não tem permissão para acessar dados deste tenant',
      );
    }

    return true;
  }
}
