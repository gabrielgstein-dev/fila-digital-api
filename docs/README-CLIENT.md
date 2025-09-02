# 📋 Como Criar o Cliente no Banco do Render

## 🔧 Configuração Necessária

### 1. Configurar a DATABASE_URL do Render

Você precisa configurar a variável de ambiente `DATABASE_URL` com as credenciais corretas do seu banco PostgreSQL no Render.

**Formato da URL:**
```
DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
```

**Exemplo real (substitua pelos seus dados):**
```bash
export DATABASE_URL="postgresql://fila_user:senha123@dpg-abc123-a.oregon-postgres.render.com:5432/fila_digital?schema=public"
```

### 2. Executar o Script

```bash
# Opção 1: Definir a variável temporariamente
export DATABASE_URL="sua_url_aqui"
node scripts/create-client.js

# Opção 2: Executar diretamente com a variável
DATABASE_URL="sua_url_aqui" node scripts/create-client.js

# Opção 3: Se já estiver no .env, apenas executar
node scripts/create-client.js
```

## 📊 Dados do Cliente que Será Criado

- **Nome:** João Silva
- **Email:** cliente.teste@email.com
- **CPF:** 03445351180 (armazenado no campo googleId)
- **Telefone:** (11) 98765-4321
- **Status:** Ativo

## 🚨 Possíveis Erros e Soluções

### Erro de Conexão (P1001)
- Verifique se a DATABASE_URL está correta
- Confirme se o banco está acessível
- Verifique se as credenciais estão corretas

### Cliente Já Existe (P2002)
- O script detectará automaticamente e mostrará os dados existentes
- Não será criado um duplicado

### Erro de Schema
- Verifique se o banco existe
- Execute `prisma db push` se necessário para criar as tabelas

## 🔍 Verificação

Após executar o script, você verá uma mensagem de sucesso com todos os dados do cliente criado, incluindo o ID único gerado.

## 📝 Notas Importantes

- O script criará automaticamente um tenant padrão se não existir
- O CPF é armazenado no campo `googleId` para simular autenticação
- O cliente será criado com status ativo
- Todos os dados são fictícios, exceto o CPF especificado

