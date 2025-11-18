# 📘 Guia Completo de Deploy - Evolution API

## 🎯 Visão Geral

O Evolution API está configurado para deploy automático no Google Cloud Run, seguindo o mesmo padrão da Fila API.

## 📋 Estrutura de Deploy

```
.github/workflows/
├── evolution-deploy-stage.yml    # Deploy para staging/QA
└── evolution-deploy-prod.yml     # Deploy para produção

Dockerfile.evolution              # Dockerfile do Evolution API
```

## 🔧 Configuração Inicial

### 1. Secrets no GitHub

Configure os seguintes secrets no GitHub:

#### Staging
- `GCP_PROJECT_ID_STAGE` - ID do projeto GCP para staging
- `GCP_SA_KEY_STAGE` - Service Account Key JSON
- `EVOLUTION_API_KEY_STAGE` - Chave de autenticação do Evolution API
- `GCP_REGION_STAGE` - Região (ex: us-central1)

#### Produção
- `GCP_PROJECT_ID_PROD` - ID do projeto GCP para produção
- `GCP_SA_KEY_PROD` - Service Account Key JSON
- `EVOLUTION_API_KEY_PROD` - Chave de autenticação do Evolution API
- `GCP_REGION_PROD` - Região (via vars ou secrets)

### 2. Variáveis (Opcional)

Você pode usar GitHub Variables para:
- `GCP_REGION_PROD` - Região do GCP para produção

## 🚀 Como Fazer Deploy

### Deploy para Staging (QA)

```bash
# 1. Criar tag com sufixo -stage
git tag evolution-1.0.0-stage

# 2. Push da tag
git push origin evolution-1.0.0-stage

# 3. GitHub Actions fará o deploy automaticamente
```

### Deploy para Produção

```bash
# 1. Criar tag sem sufixo (formato: evolution-X.Y.Z)
git tag evolution-1.0.0

# 2. Push da tag
git push origin evolution-1.0.0

# 3. GitHub Actions fará o deploy automaticamente
#    (requer aprovação se environment protection estiver ativo)
```

### Deploy Manual via GitHub UI

1. Acesse **Actions** no GitHub
2. Selecione o workflow desejado:
   - `Deploy Evolution API to Cloud Run (Staging)`
   - `Deploy Evolution API to Cloud Run (Production)`
3. Clique em **Run workflow**
4. Informe a tag desejada
5. Clique em **Run workflow**

## 📊 O que o Deploy Faz

1. ✅ **Build** da imagem Docker usando `Dockerfile.evolution`
2. ✅ **Push** para Google Container Registry
3. ✅ **Deploy** no Cloud Run com configurações:
   - Porta: 8080
   - Memória: 2Gi
   - CPU: 2
   - Staging: min-instances: 0, max-instances: 10
   - Produção: min-instances: 1, max-instances: 50
4. ✅ **Exibe URL** do serviço nos logs

## 🔗 Após o Deploy

### 1. Obter URL do Serviço

A URL será exibida nos logs do GitHub Actions. Você também pode obter via:

```bash
gcloud run services describe evolution-api \
  --region us-central1 \
  --format="value(status.url)"
```

### 2. Criar Instância no Evolution API

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

### 3. Conectar WhatsApp

Acesse no navegador:
```
https://evolution-api-xxxxx.run.app/instance/connect/default
```

Escaneie o QR Code com seu WhatsApp.

### 4. Atualizar Variáveis na Fila API

No Cloud Run da Fila API, adicione/atualize:

```bash
gcloud run services update fila-api \
  --region us-central1 \
  --update-env-vars "EVOLUTION_API_URL=https://evolution-api-xxxxx.run.app" \
  --update-secrets "EVOLUTION_API_KEY=evolution-api-key:latest" \
  --update-env-vars "EVOLUTION_INSTANCE_NAME=default"
```

Ou via GitHub Actions (se configurado nos workflows da Fila API).

## 🔄 Versionamento

### Convenção de Tags

- **Staging:** `evolution-X.Y.Z-stage` (ex: `evolution-1.0.0-stage`)
- **Produção:** `evolution-X.Y.Z` (ex: `evolution-1.0.0`)

### Exemplos

```bash
# Staging
git tag evolution-1.0.0-stage
git tag evolution-1.0.1-stage
git tag evolution-1.1.0-stage

# Produção
git tag evolution-1.0.0
git tag evolution-1.0.1
git tag evolution-1.1.0
```

## 🛠️ Troubleshooting

### Deploy não inicia

- ✅ Verifique se a tag segue o padrão correto
- ✅ Verifique se os secrets estão configurados
- ✅ Verifique se o Service Account tem permissões

### Erro de autenticação

- ✅ Verifique se `GCP_SA_KEY_STAGE` / `GCP_SA_KEY_PROD` estão corretos
- ✅ Verifique se o Service Account tem permissões:
  - Cloud Run Admin
  - Service Account User
  - Storage Admin (para Container Registry)

### Erro no build

- ✅ Verifique se `Dockerfile.evolution` existe
- ✅ Verifique se a imagem base está disponível

### Serviço não inicia

- ✅ Verifique os logs do Cloud Run
- ✅ Verifique se as variáveis de ambiente estão corretas
- ✅ Verifique se a porta 8080 está exposta

## 📚 Documentação Relacionada

- [EVOLUTION-API-SETUP.md](./EVOLUTION-API-SETUP.md) - Configuração local
- [EVOLUTION-API-GCP-DEPLOY.md](./EVOLUTION-API-GCP-DEPLOY.md) - Opções de hospedagem

## 🔒 Segurança

1. ✅ **Nunca commite** as chaves de API
2. ✅ Use **Secrets** do GitHub para dados sensíveis
3. ✅ Use **Secret Manager** do GCP para produção
4. ✅ Configure **environment protection** para produção
5. ✅ Use **Service Accounts** com permissões mínimas necessárias

---

**Última atualização:** Janeiro 2025

