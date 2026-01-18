# 🚀 Fila Digital API - Coleção Postman

Coleção completa de testes para a API Fila Digital com workflows automatizados para testar o fluxo completo de tickets.

## 📦 Arquivos

- **Fila-Digital-API-Test-Workflow.postman_collection.json** - Coleção principal com todos os endpoints
- **Fila-Digital-Local.postman_environment.json** - Ambiente local pré-configurado

## 🎯 Como Importar

### 1. Importar no Postman

1. Abra o Postman
2. Clique em **Import** (canto superior esquerdo)
3. Selecione os dois arquivos:
   - `Fila-Digital-API-Test-Workflow.postman_collection.json`
   - `Fila-Digital-Local.postman_environment.json`
4. Clique em **Import**

### 2. Configurar Ambiente

1. No canto superior direito, selecione o ambiente **"Fila Digital - Local"**
2. Verifique/ajuste as variáveis se necessário:
   - `baseUrl`: URL da API (padrão: `http://localhost:3001`)
   - `corporateUserEmail`: Email do usuário corporativo
   - `corporateUserPassword`: Senha do usuário corporativo
   - `tenantId`: ID do tenant (já pré-configurado)
   - `queueId`: ID da fila (já pré-configurado)

## 🔄 Workflow de Teste Completo

A coleção inclui um workflow automatizado em **"🔄 Workflow - Teste Completo"** que executa:

### 1. Login e Preparação
- ✅ Login corporativo
- ✅ Listar filas do tenant
- ✅ Verificar status inicial da fila

### 2. Cliente Tira Ticket
- ✅ Criar ticket (simular cliente)
- ✅ Verificar status após criação
- ✅ Buscar ticket criado

### 3. Verificação no Backoffice
- ✅ Listar filas (backoffice)
- ✅ Estatísticas da fila

### 4. Atendimento (Opcional)
- ✅ Chamar próximo ticket
- ✅ Completar atendimento

## 🎫 Endpoints Principais

### Autenticação
- `POST /api/v1/auth/login` - Login corporativo

### Empresas (Tenants)
- `POST /api/v1/tenants` - **Criar empresa (público, não requer autenticação)**
- `GET /api/v1/tenants/slug/:slug` - Buscar tenant por slug (público)
- `GET /api/v1/tenants/my-tenant` - Buscar meu tenant (autenticado)
- `PUT /api/v1/tenants/:id` - Atualizar tenant (autenticado)
- `PUT /api/v1/tenants/:id/toggle-active` - Alternar status ativo (autenticado)

### Filas
- `GET /api/v1/tenants/:tenantId/queues` - Listar filas
- `GET /api/v1/tenants/:tenantId/queues/:id` - Buscar fila
- `GET /api/v1/queues/:queueId/status` - Status público da fila
- `GET /api/v1/tenants/:tenantId/queues/:queueId/stats` - Estatísticas
- `GET /api/v1/queues/:queueId/qrcode` - Gerar QR Code

### Tickets (Público - Cliente)
- `POST /api/v1/queues/:queueId/tickets` - **Criar ticket (tirar senha)**
- `GET /api/v1/tickets/:id` - Buscar ticket

### Tickets (Autenticado - Agente)
- `POST /api/v1/tenants/:tenantId/queues/:queueId/call-next` - Chamar próximo
- `PUT /api/v1/tickets/:id/recall` - Rechamar ticket
- `PUT /api/v1/tickets/:id/skip` - Pular ticket (no show)
- `PUT /api/v1/tickets/:id/complete` - Completar atendimento

## 🏢 Como Criar uma Nova Empresa

1. Abra a pasta **"🏢 Empresas (Tenants)"**
2. Execute **"Criar Empresa (Tenant)"**
3. O endpoint é **público** (não requer autenticação)
4. O ID da empresa criada será salvo automaticamente em `newTenantId`

**Exemplo de body:**
```json
{
    "name": "Minha Empresa",
    "slug": "minha-empresa",
    "email": "contato@minhaempresa.com",
    "phone": "(11) 99999-9999"
}
```

**Campos obrigatórios:**
- `name`: Nome da empresa (2-100 caracteres)
- `slug`: Slug único (2-50 caracteres)

**Campos opcionais:**
- `email`: Email da empresa
- `phone`: Telefone da empresa

## 🧪 Como Testar o Fluxo de Ticket

### Opção 1: Workflow Automatizado (Recomendado)

1. Abra a pasta **"🔄 Workflow - Teste Completo"**
2. Execute a pasta inteira usando **"Run"** (botão no topo)
3. O Postman executará todas as requisições em sequência
4. Verifique os logs no console do Postman

### Opção 2: Manual

1. Execute **"🔐 Autenticação > Login Corporativo"**
2. Execute **"📋 Filas > Listar Filas do Tenant"** (para obter queueId)
3. Execute **"🎫 Tickets - Cliente > Criar Ticket (Tirar Senha)"**
4. Verifique no backoffice se o ticket apareceu
5. Execute **"👨‍💼 Tickets - Agente > Chamar Próximo Ticket"** (opcional)

## 📊 Variáveis Automáticas

A coleção salva automaticamente:
- `accessToken` - Token JWT após login
- `tenantId` - ID do tenant após login
- `queueId` - ID da primeira fila encontrada
- `ticketId` - ID do ticket criado
- `callingToken` - Número da senha (ex: A001)

## 🔍 Verificar no Backoffice

Após criar um ticket:

1. Abra o backoffice no navegador: `http://localhost:3000`
2. Faça login com o usuário corporativo
3. Navegue até a fila correspondente
4. O ticket deve aparecer automaticamente via SSE

## ⚙️ Configuração de Dados de Teste

Os dados pré-configurados são do banco de dados atual:

- **Tenant**: "Estabelecimento Padrão" (ID: `cmf4dbswe0000axr3yjf3q32v`)
- **Fila**: "Consulta Geral" (ID: `cmf4dct6t0001ax3nyy1q4i4z`)
- **Usuário**: `admin@empresacorporativa.com`
- **Senha**: `Corporativo@123`

Para usar outros dados, atualize as variáveis no ambiente do Postman.

## 🐛 Troubleshooting

### Token não está sendo salvo
- Verifique se o login retornou status 200
- Verifique o console do Postman para erros

### Fila não encontrada
- Execute primeiro "Listar Filas do Tenant"
- Verifique se o `tenantId` está correto

### Erro 401/403
- Verifique se o token está sendo enviado (Bearer Token)
- Faça login novamente

## 📝 Notas

- Todos os endpoints de criação de ticket são **públicos** (não requerem autenticação)
- Endpoints de gerenciamento de filas requerem autenticação JWT
- O workflow salva automaticamente os IDs para uso em requisições subsequentes
