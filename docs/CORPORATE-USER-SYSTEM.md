# 🏢 Sistema de Usuários Corporativos

## 📋 Visão Geral

O Sistema de Usuários Corporativos permite que empresas (tenants) gerenciem múltiplos usuários com diferentes níveis de acesso e permissões. Cada empresa pode ter usuários com roles hierárquicos que determinam suas capacidades no sistema.

## 🎯 Objetivos

- **Multi-usuário por empresa**: Cada tenant pode ter múltiplos usuários
- **Hierarquia de roles**: Sistema de permissões baseado em níveis
- **Controle granular**: Permissões específicas por recurso e ação
- **Segurança**: Isolamento total entre empresas
- **Flexibilidade**: Suporte a autenticação por senha e Google OAuth

## 🏗️ Arquitetura

### Modelos de Dados

#### CorporateUser
```typescript
model CorporateUser {
  id          String           @id @default(cuid())
  email       String           @unique
  name        String
  password    String?
  googleId    String?          @unique
  role        CorporateUserRole @default(OPERADOR)
  isActive    Boolean          @default(true)
  tenantId    String
  cpf         String           @unique
  phone       String?
  department  String?
  position    String?
  isDefault   Boolean          @default(false)
  isProtected Boolean          @default(false)
  tenant      Tenant           @relation(fields: [tenantId], references: [id])
  permissions CorporateUserPermission[]
}
```

#### CorporateUserPermission
```typescript
model CorporateUserPermission {
  id              String        @id @default(cuid())
  corporateUserId String
  resource        String
  action          String
  granted         Boolean       @default(true)
  corporateUser   CorporateUser @relation(fields: [corporateUserId], references: [id])
}
```

## 🔐 Sistema de Roles

### Hierarquia de Roles

1. **OPERADOR** (Nível 1)
   - Acesso básico a filas, tickets e contadores
   - Operações de atendimento

2. **GERENTE** (Nível 2)
   - Todas as permissões de OPERADOR
   - Gerenciamento de usuários corporativos
   - Relatórios básicos

3. **GESTOR** (Nível 3)
   - Todas as permissões de GERENTE
   - Configurações de tenant
   - Relatórios avançados

4. **ADMINISTRADOR** (Nível 4)
   - Acesso total ao sistema
   - Gerenciamento de permissões
   - Configurações de sistema

### Permissões por Role

| Recurso | OPERADOR | GERENTE | GESTOR | ADMINISTRADOR |
|---------|----------|---------|---------|---------------|
| `queues` | ✅ | ✅ | ✅ | ✅ |
| `tickets` | ✅ | ✅ | ✅ | ✅ |
| `counters` | ✅ | ✅ | ✅ | ✅ |
| `corporate_users` | ❌ | ✅ | ✅ | ✅ |
| `reports` | ❌ | ✅ | ✅ | ✅ |
| `tenants` | ❌ | ❌ | ✅ | ✅ |
| `system` | ❌ | ❌ | ❌ | ✅ |

## 🚀 Funcionalidades

### 1. Gestão de Usuários

#### Criar Usuário
```http
POST /api/v1/tenants/:tenantId/corporate-users
Authorization: Bearer <token>

{
  "email": "usuario@empresa.com",
  "name": "Nome do Usuário",
  "cpf": "12345678901",
  "password": "senha123",
  "role": "GERENTE",
  "department": "TI",
  "position": "Analista"
}
```

#### Listar Usuários
```http
GET /api/v1/tenants/:tenantId/corporate-users
Authorization: Bearer <token>
```

#### Atualizar Usuário
```http
PATCH /api/v1/tenants/:tenantId/corporate-users/:id
Authorization: Bearer <token>

{
  "role": "GESTOR",
  "department": "Operações"
}
```

#### Excluir Usuário
```http
DELETE /api/v1/tenants/:tenantId/corporate-users/:id
Authorization: Bearer <token>
```

### 2. Controle de Permissões

#### Verificar Permissão
```http
GET /api/v1/tenants/:tenantId/corporate-users/:id/permissions/:resource/:action
Authorization: Bearer <token>
```

#### Atribuir Permissão
```http
POST /api/v1/tenants/:tenantId/corporate-users/:id/permissions
Authorization: Bearer <token>

{
  "resource": "queues",
  "action": "create",
  "granted": true
}
```

### 3. Autenticação

#### Login com Senha
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "cpf": "12345678901",
  "password": "senha123"
}
```

#### Login com Google OAuth
```http
GET /api/v1/auth/google
```

## 🔒 Segurança

### Validações

- **Isolamento de Tenant**: Usuários só acessam recursos de sua empresa
- **Hierarquia de Roles**: Usuários só podem gerenciar roles iguais ou inferiores
- **Proteção de Usuários**: Usuários protegidos não podem ser modificados
- **Validação de CPF**: CPF único por usuário
- **Rate Limiting**: Proteção contra ataques de força bruta

### Regras de Negócio

1. **Criação de Usuários**
   - Apenas usuários com role igual ou superior podem criar outros
   - CPF e email devem ser únicos
   - Senha é obrigatória para usuários sem Google OAuth

2. **Modificação de Usuários**
   - Usuários protegidos não podem ser modificados
   - Usuários não podem modificar a si mesmos
   - Promoção de role requer permissão adequada

3. **Exclusão de Usuários**
   - Usuários protegidos não podem ser excluídos
   - Usuários não podem excluir a si mesmos
   - Apenas usuários com role superior podem excluir

## 📱 Integração com Google OAuth

### Fluxo de Autenticação

1. Usuário acessa `/auth/google`
2. Redirecionamento para Google OAuth
3. Callback com dados do usuário
4. Sistema verifica se é usuário corporativo existente
5. Se não existir, cria novo usuário
6. Gera JWT com informações do usuário
7. Redireciona para dashboard corporativo

### Mapeamento de Dados

- **Google ID**: Vinculado ao usuário para login futuro
- **Email**: Sincronizado com conta Google
- **Nome**: Atualizado automaticamente
- **Foto**: Armazenada se disponível

## 🧪 Testes

### Executar Script de Usuários Padrão

```bash
node scripts/insert-corporate-users.js
```

### Credenciais de Teste

- **Administrador**
  - Email: admin@empresacorporativa.com
  - CPF: 11111111111
  - Senha: Corporativo@123
  - Role: ADMINISTRADOR

- **Gestor**
  - Email: gestor@empresacorporativa.com
  - CPF: 22222222222
  - Senha: Corporativo@123
  - Role: GESTOR

- **Gerente**
  - Email: gerente@empresacorporativa.com
  - CPF: 33333333333
  - Senha: Corporativo@123
  - Role: GERENTE

- **Operador**
  - Email: operador@empresacorporativa.com
  - CPF: 44444444444
  - Senha: Corporativo@123
  - Role: OPERADOR

## 🔄 Migração do Banco

### Executar Migração

```bash
npx prisma migrate dev --name add_corporate_users
```

### Verificar Schema

```bash
npx prisma generate
npx prisma studio
```

## 📊 Monitoramento

### Logs de Segurança

- Tentativas de login
- Criação/modificação de usuários
- Alterações de permissões
- Acessos a recursos protegidos

### Métricas

- Usuários ativos por tenant
- Distribuição de roles
- Uso de permissões customizadas
- Tentativas de acesso negado

## 🚀 Próximos Passos

1. **Dashboard Corporativo**: Interface para gestão de usuários
2. **Auditoria**: Log detalhado de todas as ações
3. **Notificações**: Alertas de mudanças de permissões
4. **Integração SSO**: Suporte a outros provedores de identidade
5. **Backup de Usuários**: Exportação/importação de configurações

## 📞 Suporte

Para dúvidas sobre o sistema de usuários corporativos:

- **Documentação**: Este arquivo
- **Issues**: GitHub Issues do projeto
- **Desenvolvedores**: Equipe de desenvolvimento

---

*Sistema desenvolvido para garantir segurança, flexibilidade e escalabilidade no gerenciamento de usuários corporativos.*

