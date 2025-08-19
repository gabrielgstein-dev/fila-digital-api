#!/bin/bash

# Script completo para configurar GCP do zero para o projeto Fila Digital QA

set -e

echo "🚀 === CONFIGURAÇÃO COMPLETA GCP - FILA DIGITAL QA ==="
echo ""

# Variáveis do projeto
PROJECT_ID="fila-digital-qa"
REGION="europe-west1"
SERVICE_NAME="fila-api-qa"
REPOSITORY_NAME="fila-api"
SERVICE_ACCOUNT_NAME="fila-api-deploy"
SERVICE_ACCOUNT_EMAIL="${SERVICE_ACCOUNT_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "📋 Configurações:"
echo "   🆔 Projeto: $PROJECT_ID"
echo "   🌍 Região: $REGION"
echo "   🐳 Serviço: $SERVICE_NAME"
echo "   📦 Repositório: $REPOSITORY_NAME"
echo "   🔐 Service Account: $SERVICE_ACCOUNT_EMAIL"
echo ""

# Verificar se gcloud está instalado
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI não está instalado!"
    echo "📋 Instale seguindo: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

echo "✅ gcloud CLI encontrado"

# Verificar autenticação
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "@"; then
    echo "🔐 Fazendo login no Google Cloud..."
    gcloud auth login
else
    echo "✅ Usuário autenticado: $(gcloud auth list --filter=status:ACTIVE --format="value(account)")"
fi

# Verificar se o projeto existe, se não, criar
echo ""
echo "🔍 Verificando projeto $PROJECT_ID..."

if gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo "✅ Projeto $PROJECT_ID já existe"
else
    echo "🆕 Criando projeto $PROJECT_ID..."
    gcloud projects create $PROJECT_ID --name="Fila Digital QA"
    echo "✅ Projeto criado com sucesso!"
fi

# Configurar projeto ativo
echo "🔧 Configurando projeto ativo..."
gcloud config set project $PROJECT_ID

# Verificar billing (necessário para APIs)
echo ""
echo "💳 Verificando billing..."
BILLING_ENABLED=$(gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)" 2>/dev/null || echo "false")

if [ "$BILLING_ENABLED" != "True" ]; then
    echo "⚠️  Billing não está habilitado para este projeto!"
    echo "📋 Para habilitar billing:"
    echo "   1. Acesse: https://console.cloud.google.com/billing/linkedaccount?project=$PROJECT_ID"
    echo "   2. Vincule uma conta de billing"
    echo ""
    read -p "Billing já foi configurado? (y/n): " billing_ready
    if [ "$billing_ready" != "y" ]; then
        echo "❌ Configure o billing primeiro e execute novamente"
        exit 1
    fi
else
    echo "✅ Billing habilitado"
fi

# Habilitar APIs necessárias
echo ""
echo "�� Habilitando APIs necessárias..."

APIS=(
    "cloudbuild.googleapis.com"
    "run.googleapis.com"
    "artifactregistry.googleapis.com"
    "iam.googleapis.com"
    "cloudresourcemanager.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo "   �� Habilitando $api..."
    gcloud services enable $api
done

echo "✅ APIs habilitadas com sucesso!"

# Criar Artifact Registry
echo ""
echo "📦 Configurando Artifact Registry..."

if gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION &>/dev/null; then
    echo "✅ Artifact Registry $REPOSITORY_NAME já existe"
else
    echo "�� Criando Artifact Registry..."
    gcloud artifacts repositories create $REPOSITORY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Docker images para Fila Digital API"
    echo "✅ Artifact Registry criado!"
fi

# Criar Service Account
echo ""
echo "�� Configurando Service Account..."

if gcloud iam service-accounts describe $SERVICE_ACCOUNT_EMAIL &>/dev/null; then
    echo "✅ Service Account $SERVICE_ACCOUNT_NAME já existe"
else
    echo "🆕 Criando Service Account..."
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --display-name="Fila API Deploy Service Account" \
        --description="Service Account para deploy da API Fila Digital"
    echo "✅ Service Account criado!"
fi

# Adicionar permissões ao Service Account
echo "🔑 Configurando permissões..."

ROLES=(
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
    "roles/artifactregistry.admin"
    "roles/cloudbuild.builds.builder"
    "roles/storage.admin"
)

for role in "${ROLES[@]}"; do
    echo "   �� Adicionando role: $role"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SERVICE_ACCOUNT_EMAIL" \
        --role="$role" \
        --quiet
done

echo "✅ Permissões configuradas!"

# Gerar chave do Service Account
echo ""
echo "🔑 Gerando chave do Service Account..."

KEY_FILE="sa-key-${PROJECT_ID}.json"

if [ -f "$KEY_FILE" ]; then
    echo "⚠️  Arquivo de chave $KEY_FILE já existe"
    read -p "Sobrescrever? (y/n): " overwrite
    if [ "$overwrite" != "y" ]; then
        echo "📋 Usando chave existente"
    else
        rm "$KEY_FILE"
        gcloud iam service-accounts keys create $KEY_FILE \
            --iam-account=$SERVICE_ACCOUNT_EMAIL
        echo "✅ Nova chave gerada: $KEY_FILE"
    fi
else
    gcloud iam service-accounts keys create $KEY_FILE \
        --iam-account=$SERVICE_ACCOUNT_EMAIL
    echo "✅ Chave gerada: $KEY_FILE"
fi

# Configurar Docker para Artifact Registry
echo ""
echo "🐳 Configurando Docker para Artifact Registry..."
gcloud auth configure-docker ${REGION}-docker.pkg.dev
echo "✅ Docker configurado!"

# Fazer deploy inicial simples para criar o serviço
echo ""
echo "🚀 Criando serviço inicial no Cloud Run..."

# Usar uma imagem hello-world para criar o serviço
gcloud run deploy $SERVICE_NAME \
    --image=gcr.io/cloudrun/hello \
    --platform=managed \
    --region=$REGION \
    --allow-unauthenticated \
    --memory=1Gi \
    --cpu=1 \
    --concurrency=80 \
    --max-instances=5 \
    --timeout=300 \
    --port=8080 \
    --quiet

echo "✅ Serviço $SERVICE_NAME criado no Cloud Run!"

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME --region=$REGION --format="value(status.url)")
echo "🔗 URL do serviço: $SERVICE_URL"

echo ""
echo "🎉 === CONFIGURAÇÃO CONCLUÍDA COM SUCESSO! ==="
echo ""
echo "📋 Próximos passos:"
echo ""
echo "1️⃣  📤 Configurar Secrets no GitHub:"
echo "   Acesse: https://github.com/gabrielgstein-dev/fila-digital-api/settings/secrets/actions"
echo ""
echo "   📋 Adicione estes secrets:"
echo "   �� GCP_SA_KEY_QA = conteúdo completo do arquivo $KEY_FILE"
echo "   🗄️  DATABASE_URL_QA = sua string de conexão PostgreSQL do Render"
echo "   🔑 JWT_SECRET_QA = uma string aleatória segura"
echo "   🌐 CORS_ORIGIN_QA = URL do seu frontend (ex: https://app.exemplo.com)"
echo "   📡 WEBSOCKET_CORS_ORIGIN_QA = mesma URL ou diferente para WebSocket"
echo "   💾 REDIS_URL_QA = URL do Redis (opcional)"
echo ""
echo "2️⃣  📋 Para ver o conteúdo da chave do Service Account:"
echo "   cat $KEY_FILE"
echo ""
echo "3️⃣  🚀 Testar deploy:"
echo "   - Execute o workflow manualmente no GitHub Actions"
echo "   - Ou crie branch 'qa' e faça push"
echo ""
echo "4️⃣  📊 Monitoramento:"
echo "   - Cloud Run: https://console.cloud.google.com/run?project=$PROJECT_ID"
echo "   - Logs: https://console.cloud.google.com/logs?project=$PROJECT_ID"
echo "   - Artifact Registry: https://console.cloud.google.com/artifacts?project=$PROJECT_ID"
echo ""
echo "⚠️  🔒 IMPORTANTE: O arquivo $KEY_FILE contém credenciais sensíveis!"
echo "   - Adicione ao GitHub Secrets"
echo "   - NÃO commite no git"
echo "   - Delete após configurar"
echo ""
