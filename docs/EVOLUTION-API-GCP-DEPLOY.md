# 🚀 Deploy Evolution API no Google Cloud Platform

## 📍 Situação Atual

Sua aplicação **Fila API** está hospedada no **Google Cloud Run**.

O **Evolution API** é um **microserviço separado** localizado em:
- **Projeto:** `fila-evolution-api` (diretório irmão ao `fila-api`)
- **Repositório:** Repositório GitHub separado (ou monorepo)

## 🚀 Deploy Automático

O deploy do Evolution API está automatizado via GitHub Actions no projeto `fila-evolution-api`.

> **Nota:** Para fazer deploy do Evolution API, acesse o projeto `fila-evolution-api` e siga as instruções em `DEPLOY.md`.

### 📋 Como Fazer Deploy

1. **Acesse o projeto `fila-evolution-api`**
2. **Siga as instruções em `DEPLOY.md`**
3. **Configure os secrets no GitHub** (se ainda não configurados)
4. **Crie e faça push da tag** para iniciar o deploy

### 🏷️ Tags para Deploy

#### Staging (QA)
```bash
cd fila-evolution-api
git tag 1.0.0-stage
git push origin 1.0.0-stage
```

#### Produção
```bash
cd fila-evolution-api
git tag 1.0.0
git push origin 1.0.0
```

### 📝 Após o Deploy

Após o deploy bem-sucedido, você precisa:

1. **Criar instância no Evolution API:**
```bash
curl -X POST https://evolution-api-xxxxx.run.app/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "default",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

2. **Conectar WhatsApp:**
   - Acesse: `https://evolution-api-xxxxx.run.app/instance/connect/default`
   - Escaneie o QR Code

3. **Atualizar variáveis na Fila API:**
   - Adicione `EVOLUTION_API_URL` com a URL do serviço
   - Adicione `EVOLUTION_API_KEY` com a chave
   - Adicione `EVOLUTION_INSTANCE_NAME=default`

---

## 📍 Opções de Hospedagem (Manual)

Se preferir fazer deploy manual, o Evolution API pode ser hospedado de várias formas:

## ✅ Opções de Hospedagem

### 1. **Cloud Run (Recomendado)** ⭐

**Vantagens:**
- ✅ Mesma plataforma da sua API
- ✅ Escalável automaticamente
- ✅ Pay-per-use (paga apenas quando usa)
- ✅ Fácil integração
- ✅ Mesma rede/VPC

**Desvantagens:**
- ⚠️ Pode ter cold start
- ⚠️ Requer containerização

**Custo:** ~R$ 20-50/mês (dependendo do uso)

---

### 2. **Compute Engine (VM)**

**Vantagens:**
- ✅ Controle total
- ✅ Sempre ligado (sem cold start)
- ✅ Mais barato para uso constante
- ✅ Pode rodar outros serviços

**Desvantagens:**
- ⚠️ Você gerencia o servidor
- ⚠️ Precisa configurar firewall, updates, etc.

**Custo:** ~R$ 30-80/mês (dependendo da máquina)

---

### 3. **Cloud Run + Always On (Híbrido)**

**Vantagens:**
- ✅ Escalável quando necessário
- ✅ Sempre disponível (min-instances: 1)
- ✅ Melhor dos dois mundos

**Desvantagens:**
- ⚠️ Custo um pouco maior

**Custo:** ~R$ 40-70/mês

---

## 🎯 Recomendação: Deploy Automático via GitHub Actions

Para seu caso (SaaS multi-tenant), recomendo usar o **deploy automático via GitHub Actions** porque:

1. ✅ Mesmo padrão da Fila API
2. ✅ Deploy automatizado
3. ✅ Versionamento consistente
4. ✅ Fácil rollback
5. ✅ Integração com CI/CD

---

## 📦 Deploy no Cloud Run

### Passo 1: Criar Dockerfile para Evolution API

Crie `docker-compose.evolution.yml` ou use diretamente:

```dockerfile
# Dockerfile.evolution
FROM atendai/evolution-api:latest

ENV AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
ENV CONFIG_SESSION_PHONE_CLIENT=Chrome
ENV CONFIG_SESSION_PHONE_NAME=chrome
ENV WEBHOOK_GLOBAL_ENABLED=true
ENV WEBHOOK_GLOBAL_URL=${WEBHOOK_URL}
ENV WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
ENV DATABASE_ENABLED=true
ENV DATABASE_CONNECTION_URI=${DATABASE_URL}

EXPOSE 8080

CMD ["node", "dist/src/server.js"]
```

### Passo 2: Build e Push da Imagem

```bash
# Build
docker build -f Dockerfile.evolution -t gcr.io/SEU_PROJECT_ID/evolution-api:latest .

# Push
docker push gcr.io/SEU_PROJECT_ID/evolution-api:latest
```

### Passo 3: Deploy no Cloud Run

```bash
gcloud run deploy evolution-api \
  --image gcr.io/SEU_PROJECT_ID/evolution-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars "AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA" \
  --set-env-vars "DATABASE_ENABLED=false" \
  --set-secrets "EVOLUTION_API_KEY=EVOLUTION_API_KEY:latest"
```

### Passo 4: Obter URL do Serviço

```bash
EVOLUTION_URL=$(gcloud run services describe evolution-api \
  --region us-central1 \
  --format="value(status.url)")

echo "Evolution API URL: $EVOLUTION_URL"
```

### Passo 5: Atualizar Variáveis de Ambiente da Fila API

No Cloud Run da Fila API, adicione:

```bash
EVOLUTION_API_URL=https://evolution-api-xxxxx.run.app
EVOLUTION_API_KEY=sua-chave-secreta
EVOLUTION_INSTANCE_NAME=default
```

---

## 🔧 Configuração Completa

### 1. Criar Secret no Secret Manager

```bash
echo -n "sua-chave-super-secreta-aqui" | \
  gcloud secrets create evolution-api-key \
  --data-file=-
```

### 2. Deploy com Secrets

```bash
gcloud run deploy evolution-api \
  --image gcr.io/SEU_PROJECT_ID/evolution-api:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --update-secrets "AUTHENTICATION_API_KEY=evolution-api-key:latest"
```

### 3. Criar Instância no Evolution API

```bash
EVOLUTION_URL="https://evolution-api-xxxxx.run.app"
API_KEY="sua-chave-secreta"

curl -X POST "$EVOLUTION_URL/instance/create" \
  -H "apikey: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "default",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### 4. Conectar WhatsApp

Acesse no navegador:
```
https://evolution-api-xxxxx.run.app/instance/connect/default
```

Escaneie o QR Code com seu WhatsApp.

---

## 📊 Comparação de Custos

### Cloud Run (Pay-per-use)
- **0 mensagens:** ~R$ 0 (min-instances: 0)
- **10.000 mensagens:** ~R$ 20-30
- **100.000 mensagens:** ~R$ 50-80

### Compute Engine (VM sempre ligada)
- **e2-micro (1 vCPU, 1GB RAM):** ~R$ 30/mês
- **e2-small (2 vCPU, 2GB RAM):** ~R$ 60/mês
- **e2-medium (2 vCPU, 4GB RAM):** ~R$ 120/mês

### Cloud Run (Always On - min-instances: 1)
- **Base:** ~R$ 40/mês
- **+ uso:** ~R$ 0,001 por requisição

---

## 🎯 Recomendação Final

Para seu SaaS multi-tenant:

1. **Início:** Cloud Run com `min-instances: 0` (pay-per-use)
2. **Crescimento:** Cloud Run com `min-instances: 1` (always on)
3. **Alto volume:** Compute Engine (VM dedicada)

---

## 🔄 Integração com Fila API

Após deploy, atualize as variáveis de ambiente da Fila API:

```bash
gcloud run services update fila-api \
  --region us-central1 \
  --update-env-vars "EVOLUTION_API_URL=https://evolution-api-xxxxx.run.app" \
  --update-secrets "EVOLUTION_API_KEY=evolution-api-key:latest" \
  --update-env-vars "EVOLUTION_INSTANCE_NAME=default"
```

---

## 🛠️ Script de Deploy Automatizado

Crie `scripts/deploy-evolution-api.sh`:

```bash
#!/bin/bash

PROJECT_ID="seu-project-id"
REGION="us-central1"
SERVICE_NAME="evolution-api"
IMAGE_NAME="gcr.io/$PROJECT_ID/$SERVICE_NAME"

echo "🏗️ Building image..."
docker build -f Dockerfile.evolution -t $IMAGE_NAME:latest .

echo "📤 Pushing image..."
docker push $IMAGE_NAME:latest

echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
  --image $IMAGE_NAME:latest \
  --region $REGION \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 2Gi \
  --cpu 2 \
  --min-instances 1 \
  --max-instances 10 \
  --update-secrets "AUTHENTICATION_API_KEY=evolution-api-key:latest"

echo "✅ Deploy completed!"
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
  --region $REGION \
  --format="value(status.url)")
echo "🌐 Evolution API URL: $SERVICE_URL"
```

---

## 📚 Próximos Passos

1. ✅ Criar Dockerfile para Evolution API
2. ✅ Fazer deploy no Cloud Run
3. ✅ Configurar variáveis de ambiente
4. ✅ Criar instância e conectar WhatsApp
5. ✅ Testar envio de mensagens

---

**Última atualização:** Janeiro 2025
