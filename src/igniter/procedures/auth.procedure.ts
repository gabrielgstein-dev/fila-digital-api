import { igniter } from '../router';
import { auth } from '@/lib/auth'; // NextAuth v5
import { NextRequest } from 'next/server';

export const authProcedure = igniter.procedure({
  handler: async ({ request, response }) => {
    try {
      // Converter Request para NextRequest
      const nextRequest = new NextRequest(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });

      // Obter sessão do NextAuth
      const session = await auth(nextRequest);

      if (!session?.user) {
        return response.unauthorized({
          message: 'Usuário não autenticado',
        });
      }

      // Retornar contexto de autenticação
      return {
        auth: {
          user: session.user,
          userId: session.user.id,
          role: session.user.role,
          tenantId: session.user.tenantId,
          tenant: session.user.tenant,
          accessToken: session.user.accessToken,
          userType: session.user.userType,
        },
      };
    } catch (error) {
      console.error('❌ Erro na procedure de auth:', error);
      return response.unauthorized({
        message: 'Erro na autenticação',
      });
    }
  },
});

// Procedure para roles específicos
export const createRoleProcedure = (requiredRoles: string[]) =>
  igniter.procedure({
    handler: async ({ request, response }) => {
      // Primeiro validar autenticação
      const authResult = await authProcedure.handler({ request, response });

      if (authResult.status !== 200) {
        return authResult;
      }

      const { auth } = authResult.data;

      // Verificar se o usuário tem o role necessário
      if (!requiredRoles.includes(auth.role)) {
        return response.forbidden({
          message: `Acesso negado. Roles necessários: ${requiredRoles.join(', ')}`,
        });
      }

      return { auth };
    },
  });

// Procedure para tenants específicos
export const createTenantProcedure = (requiredTenantIds?: string[]) =>
  igniter.procedure({
    handler: async ({ request, response }) => {
      // Primeiro validar autenticação
      const authResult = await authProcedure.handler({ request, response });

      if (authResult.status !== 200) {
        return authResult;
      }

      const { auth } = authResult.data;

      // Se não especificou tenants, permitir acesso ao próprio tenant
      if (!requiredTenantIds) {
        return { auth };
      }

      // Verificar se o usuário tem acesso ao tenant
      if (!requiredTenantIds.includes(auth.tenantId)) {
        return response.forbidden({
          message: `Acesso negado ao tenant. Tenants permitidos: ${requiredTenantIds.join(', ')}`,
        });
      }

      return { auth };
    },
  });

// Procedure para permissões específicas
export const createPermissionProcedure = (requiredPermissions: string[]) =>
  igniter.procedure({
    handler: async ({ request, response }) => {
      // Primeiro validar autenticação
      const authResult = await authProcedure.handler({ request, response });

      if (authResult.status !== 200) {
        return authResult;
      }

      const { auth } = authResult.data;

      // Verificar permissões baseadas no role
      const userPermissions = getUserPermissions(auth.role);

      const hasPermission = requiredPermissions.some((permission) =>
        userPermissions.includes(permission),
      );

      if (!hasPermission) {
        return response.forbidden({
          message: `Acesso negado. Permissões necessárias: ${requiredPermissions.join(', ')}`,
        });
      }

      return { auth };
    },
  });

// Função auxiliar para obter permissões por role
function getUserPermissions(role: string): string[] {
  const rolePermissions: Record<string, string[]> = {
    super_admin: ['*'],
    admin: [
      'dashboard:read',
      'dashboard:write',
      'users:read',
      'users:write',
      'tenants:read',
    ],
    manager: ['dashboard:read', 'users:read', 'tickets:read', 'tickets:write'],
    agent: ['dashboard:read', 'tickets:read', 'tickets:write'],
    user: ['dashboard:read', 'tickets:read'],
  };

  return rolePermissions[role] || [];
}
