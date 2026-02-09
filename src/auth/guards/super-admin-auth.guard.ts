import {
  Injectable,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Reflector } from '@nestjs/core';

@Injectable()
export class SuperAdminAuthGuard extends JwtAuthGuard {
  constructor(private readonly superAdminReflector: Reflector) {
    super(superAdminReflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isAuthenticated = await super.canActivate(context);

    if (!isAuthenticated) {
      throw new UnauthorizedException('Token inválido ou expirado');
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Usuário não autenticado');
    }

    if (user.userType !== 'superadmin') {
      throw new ForbiddenException(
        'Acesso restrito aos administradores do sistema',
      );
    }

    return true;
  }
}
