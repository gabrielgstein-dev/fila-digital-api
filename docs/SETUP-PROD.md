# Setup Projeto Fila Digital - Produção

## 📋 Visão Geral

Este guia vai ajudar você a replicar a estrutura do projeto `fila-digital-qa` para o novo projeto `fila-digital` em produção.

## 🏗️ Estrutura do Projeto QA (Referência)

- **Projeto GCP**: `fila-digital-qa`
- **Região**: `us-central1`
- **Serviço Cloud Run**: `fila-api-stage`
- **Dockerfile**: `Dockerfile.qa`

## 🚀 Passos para Configurar PROD

### 1. Criar Projeto GCP

```bash
# Acessar console Google Cloud
# Criar novo projeto: "fila-digital"
# Anotar o Project ID (ex: fila-digital-12345)
```

### 2. Configurar APIs Necessárias

```bash
# Substitua PROJECT_ID pelo ID real do projeto fila-digital
gcloud config set project PROJECT_ID

# Habilitar APIs
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable cloudresourcemanager.googleapis.com
```

### 3. Criar Conta de Serviço

```bash
# Criar conta de serviço para GitHub Actions
gcloud iam service-accounts create github-actions \
    --description="Conta de serviço para GitHub Actions - Produção" \
    --display-name="GitHub Actions Prod"

# Obter email da conta
SA_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:GitHub Actions Prod" \
    --format="value(email)")

# Atribuir permissões
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/cloudbuild.admin"

# Gerar chave JSON
gcloud iam service-accounts keys create github-actions-prod-key.json \
    --iam-account=$SA_EMAIL
```

### 4. Criar Repositório Docker

```bash
# Criar repositório no Artifact Registry
gcloud artifacts repositories create docker-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Repositório Docker para Fila API - Produção"
```

### 5. Configurar Secrets no GitHub

No repositório GitHub, configure os seguintes secrets:

#### Secrets de Autenticação
- `GCP_SA_KEY_PROD`: Conteúdo do arquivo `github-actions-prod-key.json`
- `GCP_PROJECT_ID_PROD`: ID do projeto GCP (ex: fila-digital-12345)

#### Secrets de Aplicação
- `DATABASE_URL_PROD`: URL do banco de dados PostgreSQL (Render)
- `JWT_SECRET_PROD`: Chave secreta JWT (gerar nova)
- `RABBITMQ_URL_PROD`: URL do RabbitMQ (se usar)
- `WHATSAPP_MIN_DELAY_MS_PROD`: Delay para WhatsApp (ex: 1000)
- `META_API_VERSION_PROD`: Versão API Meta (ex: 18.0)
- `META_PHONE_NUMBER_ID_PROD`: ID telefone WhatsApp
- `META_ACCESS_TOKEN_PROD`: Token acesso WhatsApp
- `FRONTEND_URL_PROD`: URL frontend produção (ex: https://fila-digital.com)

#### Variáveis (vars)
- `GCP_REGION_PROD`: `us-central1`
- `BACKEND_SERVICE_NAME_PROD`: `agiliza-api-prod`

### 6. Ajustar Workflow de Produção

O workflow `cloudrun-deploy-prod.yml` já está configurado para usar:
- Dockerfile.production
- Variáveis de ambiente PROD
- Tags sem sufixo (X.Y.Z)

### 7. Deploy Inicial

```bash
# Fazer primeiro deploy manual para testar
./scripts/deploy-prod.sh PROJECT_ID us-central1

# Ou via GitHub Actions:
# pnpm run version:prod-patch
# Isso criará tag 1.0.0 e acionará o workflow
```

## 🔧 Configurações Específicas de Produção

### Cloud Run Service
- **Nome**: `agiliza-api-prod`
- **Memória**: 2Gi
- **CPU**: 2
- **Instâncias mínimas**: 1
- **Instâncias máximas**: 50
- **Porta**: 8080
- **Ambiente**: production

### Variáveis de Ambiente
- `NODE_ENV=production`
- `ENVIRONMENT=production`
- `CORS_ORIGIN=https://fila-digital.com,https://www.fila-digital.com,https://app.fila-digital.com`
- `DATABASE_PROVIDER=render`

## 📝 Checklist Antes do Deploy

- [ ] Projeto GCP criado e APIs habilitadas
- [ ] Conta de serviço criada com permissões corretas
- [ ] Repositório Docker criado
- [ ] Secrets configurados no GitHub
- [ ] Banco de dados produção configurado
- [ ] Domínios configurados para CORS
- [ ] Workflow testado

## 🚨 Considerações de Segurança

- Use secrets diferentes para produção
- Configure aprovação manual para environment production
- Monitore logs e métricas
- Configure alertas

## 🔄 Migração de Dados

Se necessário migrar dados do QA para PROD:

```bash
# Exportar do QA
npx prisma db push --schema=./prisma/schema.prisma

# Aplicar migrações em produção
npx prisma migrate deploy
```

## 📚 Comandos Úteis

```bash
# Verificar serviços
gcloud run services list --region=us-central1

# Verificar logs
gcloud logs read "resource.type=cloud_run" --limit=50

# Descrever serviço
gcloud run services describe fila-api-prod --region=us-central1
```
