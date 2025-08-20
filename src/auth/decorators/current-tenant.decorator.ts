import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentTenant = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      return null;
    }

    // Se especificado um campo específico (ex: @CurrentTenant('id'))
    if (data) {
      return user.tenant?.[data] || user[data];
    }

    // Retorna dados completos do tenant
    return {
      id: user.tenantId,
      ...user.tenant,
    };
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
