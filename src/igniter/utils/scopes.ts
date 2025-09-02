export interface UserScopes {
  userId: string;
  role: string;
  tenantId: string;
  permissions: string[];
}

export function createUserScopes(session: any): string[] {
  if (!session?.user) return [];

  const scopes = [
    `user:${session.user.id}`,
    `role:${session.user.role}`,
    `tenant:${session.user.tenantId}`,
  ];

  // Adicionar scopes baseados em permissões
  if (session.user.role === 'admin') {
    scopes.push('admin:*');
  }

  if (session.user.role === 'super_admin') {
    scopes.push('super_admin:*');
  }

  // Adicionar scopes específicos por tenant
  if (session.user.tenantId) {
    scopes.push(`tenant:${session.user.tenantId}:*`);
  }

  return scopes;
}

export function canAccessScope(
  userScopes: string[],
  requiredScopes: string[],
): boolean {
  return requiredScopes.some((required) =>
    userScopes.some(
      (user) =>
        user === required ||
        (user.endsWith(':*') && required.startsWith(user.slice(0, -2))),
    ),
  );
}

export function filterScopesByUser(
  userScopes: string[],
  targetScopes: string[],
): string[] {
  return targetScopes.filter((scope) => canAccessScope(userScopes, [scope]));
}

export function createRealtimeScopes(session: any): {
  userScopes: string[];
  tenantScopes: string[];
  roleScopes: string[];
} {
  if (!session?.user) {
    return {
      userScopes: [],
      tenantScopes: [],
      roleScopes: [],
    };
  }

  const userScopes = [`user:${session.user.id}`];
  const tenantScopes = [`tenant:${session.user.tenantId}`];
  const roleScopes = [`role:${session.user.role}`];

  // Adicionar scopes baseados em hierarquia de roles
  if (session.user.role === 'super_admin') {
    roleScopes.push('role:admin', 'role:manager', 'role:agent', 'role:user');
  } else if (session.user.role === 'admin') {
    roleScopes.push('role:manager', 'role:agent', 'role:user');
  } else if (session.user.role === 'manager') {
    roleScopes.push('role:agent', 'role:user');
  }

  return {
    userScopes,
    tenantScopes,
    roleScopes,
  };
}

export function validateScopeAccess(
  userScopes: string[],
  requiredScope: string,
): { hasAccess: boolean; reason?: string } {
  // Verificar acesso direto
  if (userScopes.includes(requiredScope)) {
    return { hasAccess: true };
  }

  // Verificar acesso via wildcard
  const wildcardScopes = userScopes.filter((scope) => scope.endsWith(':*'));
  for (const wildcardScope of wildcardScopes) {
    const prefix = wildcardScope.slice(0, -2);
    if (requiredScope.startsWith(prefix)) {
      return { hasAccess: true };
    }
  }

  // Verificar acesso hierárquico
  if (requiredScope.startsWith('role:')) {
    const requiredRole = requiredScope.split(':')[1];
    const userRoles = userScopes
      .filter((scope) => scope.startsWith('role:'))
      .map((scope) => scope.split(':')[1]);

    if (userRoles.includes('super_admin')) {
      return { hasAccess: true };
    }

    if (
      userRoles.includes('admin') &&
      ['manager', 'agent', 'user'].includes(requiredRole)
    ) {
      return { hasAccess: true };
    }

    if (
      userRoles.includes('manager') &&
      ['agent', 'user'].includes(requiredRole)
    ) {
      return { hasAccess: true };
    }
  }

  return {
    hasAccess: false,
    reason: `Usuário não tem acesso ao scope: ${requiredScope}`,
  };
}
