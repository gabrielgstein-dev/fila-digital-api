-- Primeiro, criar um tenant padrão se não existir
INSERT INTO "tenants"
  (
  "id",
  "name",
  "slug",
  "email",
  "phone",
  "isActive",
  "createdAt",
  "updatedAt"
  )
VALUES
  (
    'default-tenant-001',
    'Estabelecimento Padrão',
    'estabelecimento-padrao',
    'contato@estabelecimento.com',
    '(11) 99999-9999',
    true,
    NOW(),
    NOW()
  );

-- Inserir usuário cliente padrão
INSERT INTO "users"
  (
  "id",
  "email",
  "cpf",
  "password",
  "name",
  "isActive",
  "isDefault",
  "isProtected",
  "createdAt",
  "updatedAt"
  )
VALUES
  (
    'default-client-001',
    'cliente.padrao@fila.com',
    '00000000001',
    '$2b$10$HJHSJ6cX4.3fjj4Rl4G/GObsDwh8vADa.7.5jV0GlXWWSXXXYbhiG',
    'Cliente Padrão',
    true,
    true,
    true,
    NOW(),
    NOW()
  );

-- Inserir usuário atendente padrão
INSERT INTO "agents"
  (
  "id",
  "email",
  "cpf",
  "password",
  "name",
  "role",
  "isActive",
  "isDefault",
  "isProtected",
  "tenantId",
  "createdAt",
  "updatedAt"
  )
VALUES
  (
    'default-agent-001',
    'atendente.padrao@fila.com',
    '00000000002',
    '$2b$10$HJHSJ6cX4.3fjj4Rl4G/GObsDwh8vADa.7.5jV0GlXWWSXXXYbhiG',
    'Atendente Padrão',
    'ATTENDANT',
    true,
    true,
    true,
    'default-tenant-001',
    NOW(),
    NOW()
  );
