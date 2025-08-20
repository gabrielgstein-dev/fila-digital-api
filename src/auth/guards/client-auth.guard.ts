import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class ClientAuthGuard extends JwtAuthGuard {
  constructor(private clientReflector: Reflector) {
    super(clientReflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Verificar se a rota é pública
    const isPublic = this.clientReflector.getAllAndOverride<boolean>(
      'isPublic',
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    // Primeiro, verificar se o JWT é válido
    const canActivate = await super.canActivate(context);
    if (!canActivate) {
      return false;
    }

    // Verificar se é um cliente
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'client') {
      throw new ForbiddenException('Acesso permitido apenas para clientes');
    }

    return true;
  }
}
