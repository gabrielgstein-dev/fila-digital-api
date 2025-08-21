# Configuração do Google Cloud Platform (GCP)

## APIs Necessárias

Antes de executar o deploy automático via GitHub Actions, você precisa habilitar as seguintes APIs no seu projeto GCP:

### 1. APIs Obrigatórias

```bash
# Artifact Registry (para armazenar imagens Docker)
gcloud services enable artifactregistry.googleapis.com

# Cloud Run (para executar a aplicação)
gcloud services enable run.googleapis.com

# Cloud Build (para build de imagens)
gcloud services enable cloudbuild.googleapis.com
```

### 2. Como Habilitar

```bash
# Substitua PROJECT_ID pelo seu ID do projeto
gcloud config set project PROJECT_ID

# Habilite as APIs
gcloud services enable artifactregistry.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
```

## Conta de Serviço

### 1. Criar Conta de Serviço

```bash
# Criar conta de serviço
gcloud iam service-accounts create github-actions \
    --description="Conta de serviço para GitHub Actions" \
    --display-name="GitHub Actions"

# Obter email da conta
SA_EMAIL=$(gcloud iam service-accounts list \
    --filter="displayName:GitHub Actions" \
    --format="value(email)")
```

### 2. Atribuir Permissões

```bash
# Permissões para Artifact Registry
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.admin"

# Permissões para Cloud Run
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

# Permissões para Service Accounts
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# Permissões para Storage (se necessário)
gcloud projects add-iam-policy-binding PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"
```

### 3. Gerar Chave

```bash
# Gerar chave JSON
gcloud iam service-accounts keys create key.json \
    --iam-account=$SA_EMAIL

# A chave será salva em key.json
# Copie o conteúdo para o secret GCP_SA_KEY no GitHub
```

## Repositório Docker

### 1. Criar Repositório

```bash
# Criar repositório no Artifact Registry
gcloud artifacts repositories create docker-repo \
    --repository-format=docker \
    --location=us-central1 \
    --description="Repositório Docker para Fila API"
```

### 2. Configurar Localização

O repositório deve estar na mesma região que o Cloud Run:
- **Staging**: `us-central1` (ou sua região preferida)
- **Produção**: `us-central1` (ou sua região preferida)

## Secrets do GitHub

Configure os seguintes secrets no seu repositório GitHub:

### Secrets Obrigatórios

**Para Staging:**
- `GCP_SA_KEY_STAGE`: Conteúdo do arquivo `key.json` da conta de serviço para staging
- `GCP_PROJECT_ID_STAGE`: ID do projeto GCP para staging

**Para Produção:**
- `GCP_SA_KEY_PROD`: Conteúdo do arquivo `key.json` da conta de serviço para produção
- `GCP_PROJECT_ID_PROD`: ID do projeto GCP para produção

### Secrets de Ambiente

**Staging:**
- `DATABASE_URL_STAGE`: URL do banco de dados para staging
- `JWT_SECRET_STAGE`: Chave secreta JWT para staging
- `RABBITMQ_URL_STAGE`: URL do RabbitMQ para staging

**Produção:**
- `DATABASE_URL_PROD`: URL do banco de dados para produção
- `JWT_SECRET_PROD`: Chave secreta JWT para produção
- `RABBITMQ_URL_PROD`: URL do RabbitMQ para produção

### Variáveis (vars)

**Staging:**
- `GCP_REGION_STAGE`: Região do GCP para staging (ex: us-central1)
- `NODE_ENV_STAGE`: Ambiente Node.js para staging
- `BACKEND_SERVICE_NAME_STAGE`: Nome do serviço no Cloud Run (ex: fila-api-stage)

**Produção:**
- `GCP_REGION_PROD`: Região do GCP para produção (ex: us-central1)
- `BACKEND_SERVICE_NAME_PROD`: Nome do serviço no Cloud Run (ex: fila-api-prod)

## Verificação

### 1. Testar Autenticação

```bash
# Testar se a conta de serviço funciona
gcloud auth activate-service-account --key-file=key.json

# Verificar projeto
gcloud config get-value project

# Listar repositórios
gcloud artifacts repositories list
```

### 2. Testar Permissões

```bash
# Testar criação de repositório
gcloud artifacts repositories create test-repo \
    --repository-format=docker \
    --location=us-central1

# Testar deploy no Cloud Run
gcloud run deploy test-service \
    --image=hello-world \
    --region=us-central1 \
    --allow-unauthenticated
```

## Troubleshooting

### Erro: "You do not currently have an active account selected"

- Verifique se a conta de serviço está configurada corretamente
- Confirme se a chave JSON está no secret `GCP_SA_KEY`

### Erro: "denied: Unauthenticated request"

- Verifique se as APIs estão habilitadas
- Confirme se a conta de serviço tem permissões adequadas
- Verifique se o repositório Docker existe

### Erro: "API not enabled"

- Habilite as APIs necessárias manualmente
- Aguarde alguns minutos para propagação
- Verifique se o projeto está ativo
