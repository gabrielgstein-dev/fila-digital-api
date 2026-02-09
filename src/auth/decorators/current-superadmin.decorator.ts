import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const CurrentSuperAdmin = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.userType !== 'superadmin') {
      return null;
    }

    if (data) {
      return user[data];
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },
);
