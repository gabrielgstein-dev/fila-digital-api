import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentClient = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    // Só retornar se for cliente
    if (user && user.userType === 'client') {
      return user;
    }

    return null;
  },
);

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);
