import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'agent') {
      return null;
    }

    return user.tenantId;
  },
);

export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // Se especificado um campo específico (ex: @CurrentUser('role'))
    if (data) {
      return user[data];
    }

    // Retorna dados completos do usuário (sem senha)
    return user;
  },
);
