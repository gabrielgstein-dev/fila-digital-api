import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentAgent = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (
      !user ||
      (user.userType !== 'agent' && user.userType !== 'corporate_user')
    ) {
      return null;
    }

    if (data) {
      return user[data];
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenantId,
      tenant: user.tenant,
    };
  },
);
