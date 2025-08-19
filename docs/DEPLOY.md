# 🚀 Deploy QA - Fila Digital API

Esta documentação explica como configurar e fazer deploy da API em ambiente QA usando Google Cloud Platform e Postgres no Render.

**📍 Repositório:** `git@github.com:gabrielgstein-dev/fila-digital-api.git`

## 📋 Pré-requisitos

### 1. Google Cloud Platform
- ✅ Projeto `fila-digital-qa` criado
- ✅ Billing habilitado
- ✅ gcloud CLI instalado e configurado

### 2. Render (Banco de Dados)
- ✅ Conta no Render.com
- ✅ Instância PostgreSQL criada
- ✅ URL de conexão obtida

### 3. GitHub
- ✅ Repositório `gabrielgstein-dev/fila-digital-api` configurado
- ✅ Secrets configurados (veja abaixo)

## 🔧 Configuração Inicial

### 1. Configurar GCP
Execute o script de configuração automática:

```bash
# Dar permissão de execução
chmod +x scripts/setup-gcp-qa.sh

# Executar configuração
./scripts/setup-gcp-qa.sh
```

Este script irá:
- ✅ Habilitar APIs necessárias
- ✅ Criar Artifact Registry
- ✅ Configurar Service Account
- ✅ Gerar chave de autenticação
- ✅ Configurar permissões

### 2. Configurar Banco no Render

1. **Criar Postgres no Render:**
   - Acesse [render.com](https://render.com)
   - Crie um novo PostgreSQL Database
   - Anote a **External Database URL**

2. **Exemplo de URL:**
   ```
   postgresql://user:password@dpg-xxxxx-a.oregon-postgres.render.com/dbname_xxx
   ```

### 3. Configurar GitHub Secrets

No repositório **`gabrielgstein-dev/fila-digital-api`**, vá em **Settings > Secrets and variables > Actions** e adicione:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `GCP_SA_KEY_QA` | Chave JSON do Service Account | `{"type": "service_account"...}` |
| `DATABASE_URL_QA` | URL do Postgres no Render | `postgresql://user:pass@host/db` |
| `JWT_SECRET_QA` | Secret para tokens JWT | `meu-super-secret-jwt-qa-2024` |
| `REDIS_URL_QA` | URL do Redis (opcional) | `redis://user:pass@host:port` |
| `CORS_ORIGIN_QA` | URL do frontend QA | `https://fila-frontend-qa.vercel.app` |
| `WEBSOCKET_CORS_ORIGIN_QA` | URL para WebSockets | `https://fila-frontend-qa.vercel.app` |

### 4. Obter Chave do Service Account

Após executar o script de setup:

```bash
# Visualizar chave gerada
cat github-actions-qa-key.json

# Copiar todo o conteúdo JSON para o secret GCP_SA_KEY_QA
```

## 🚀 Deploy Automático

### Triggers de Deploy

O deploy QA é acionado automaticamente quando:

- ✅ **Push para branch `develop`**
- ✅ **Push para branch `qa`** 
- ✅ **Pull Request mergeado para `main`**

### Fluxo de Deploy

1. **Build da aplicação**
   - Instala dependências com pnpm
   - Gera Prisma Client
   - Compila TypeScript
   - Cria imagem Docker otimizada

2. **Push para Artifact Registry**
   - Tag com hash do commit
   - Tag `latest` para referência

3. **Deploy no Cloud Run**
   - Configuração de recursos otimizada
   - Variáveis de ambiente injetadas
   - Health check configurado

4. **Migrações do Banco**
   - Executa `prisma migrate deploy`
   - Atualiza schema automaticamente

## 🔍 Monitoramento

### URLs Importantes

- **🌐 API QA:** `https://fila-api-qa-[hash].europe-west1.run.app`
- **📚 Swagger:** `https://fila-api-qa-[hash].europe-west1.run.app/api`
- **💚 Health Check:** `https://fila-api-qa-[hash].europe-west1.run.app/api/v1`

### Logs e Métricas

```bash
# Ver logs do Cloud Run
gcloud run services logs read fila-api-qa --region=europe-west1

# Ver detalhes do serviço
gcloud run services describe fila-api-qa --region=europe-west1
```

### Console GCP
- **Cloud Run:** https://console.cloud.google.com/run
- **Logs:** https://console.cloud.google.com/logs
- **Artifact Registry:** https://console.cloud.google.com/artifacts

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Deploy Falha na Autenticação
```
Error: Could not load the default credentials
```
**Solução:** Verificar se `GCP_SA_KEY_QA` está configurado corretamente.

#### 2. Erro de Conexão com Banco
```
Error: connect ECONNREFUSED
```
**Solução:** Verificar `DATABASE_URL_QA` e conectividade com Render.

#### 3. Build Docker Falha
```
Error: COPY failed
```
**Solução:** Verificar `.dockerignore` e estrutura de arquivos.

#### 4. Migrações Falham
```
Error: Migration failed
```
**Solução:** Verificar schema e executar migrações manualmente:

```bash
# Executar localmente com URL do QA
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

### Debug Local

```bash
# Testar build Docker localmente
docker build -f Dockerfile.qa -t fila-api-qa .

# Testar com variáveis de ambiente
docker run -p 8080:8080 \
  -e DATABASE_URL="postgresql://..." \
  -e JWT_SECRET="test-secret" \
  fila-api-qa
```

### Rollback

```bash
# Listar versões disponíveis
gcloud run revisions list --service=fila-api-qa --region=europe-west1

# Fazer rollback para versão anterior
gcloud run services update-traffic fila-api-qa \
  --to-revisions=REVISION-NAME=100 \
  --region=europe-west1
```

## 📈 Otimizações

### Performance
- ✅ Multi-stage Docker build
- ✅ Node.js 22 Alpine (imagem mínima)
- ✅ pnpm para dependências otimizadas
- ✅ Health checks configurados

### Segurança
- ✅ Usuário não-root no container
- ✅ Secrets gerenciados pelo GitHub
- ✅ CORS configurado adequadamente
- ✅ Rate limiting habilitado

### Custo
- ✅ Recursos otimizados (1Gi RAM, 1 CPU)
- ✅ Auto-scaling configurado
- ✅ Timeout adequado (300s)

## 🔄 Atualizações

### Configurar Repositório Remoto
```bash
# Adicionar repositório remoto
git remote add origin git@github.com:gabrielgstein-dev/fila-digital-api.git

# Verificar configuração
git remote -v

# Primeiro push
git push -u origin main
```

### Atualizar Dependências
```bash
# Atualizar package.json
pnpm update

# Commit e push para trigger do deploy
git add package.json pnpm-lock.yaml
git commit -m "chore: update dependencies"
git push origin develop
```

### Atualizar Schema do Banco
```bash
# Criar nova migração
npx prisma migrate dev --name add_new_feature

# Deploy será feito automaticamente no próximo push
```

## 🎯 Checklist de Setup

- [ ] **1. Configurar projeto GCP**
  ```bash
  ./scripts/setup-gcp-qa.sh
  ```

- [ ] **2. Criar banco no Render**
  - Acessar render.com
  - Criar PostgreSQL Database
  - Copiar External Database URL

- [ ] **3. Configurar repositório GitHub**
  ```bash
  git remote add origin git@github.com:gabrielgstein-dev/fila-digital-api.git
  git push -u origin main
  ```

- [ ] **4. Adicionar secrets no GitHub**
  - Ir para `gabrielgstein-dev/fila-digital-api > Settings > Secrets`
  - Adicionar os 6 secrets listados acima

- [ ] **5. Testar deploy**
  ```bash
  git checkout -b develop
  git push origin develop
  ```

- [ ] **6. Verificar deploy**
  - Acessar GitHub Actions
  - Verificar logs do deploy
  - Testar API deployed

---

**💡 Dica:** Use sempre a branch `develop` para testes e `main` para releases estáveis!

**📍 Repositório:** https://github.com/gabrielgstein-dev/fila-digital-api 