#!/bin/bash

# Script para setup completo do ambiente PROD no Google Cloud
# Uso: ./scripts/setup-prod.sh PROJECT_ID

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
SERVICE_ACCOUNT_NAME="github-actions-prod"
SERVICE_ACCOUNT_DISPLAY="GitHub Actions Prod"
REPO_NAME="docker-repo"
REGION="us-central1"

# Verificar parâmetros
if [ -z "$1" ]; then
    echo -e "${RED}❌ Erro: PROJECT_ID é obrigatório${NC}"
    echo -e "${YELLOW}Uso: ./scripts/setup-prod.sh PROJECT_ID${NC}"
    echo -e "${YELLOW}Exemplo: ./scripts/setup-prod.sh fila-digital-12345${NC}"
    exit 1
fi

PROJECT_ID=$1

echo -e "${BLUE}🚀 Setup do Ambiente PROD - Fila Digital${NC}"
echo -e "${BLUE}============================================${NC}"
echo -e "${YELLOW}📋 Configurações:${NC}"
echo -e "  Project ID: ${PROJECT_ID}"
echo -e "  Região: ${REGION}"
echo -e "  Service Account: ${SERVICE_ACCOUNT_NAME}"
echo ""

# Verificar gcloud
if ! command -v gcloud &> /dev/null; then
    echo -e "${RED}❌ gcloud CLI não encontrado. Instale o Google Cloud SDK.${NC}"
    exit 1
fi

# Configurar projeto
echo -e "${BLUE}🔧 Configurando projeto...${NC}"
gcloud config set project $PROJECT_ID

# Habilitar APIs
echo -e "${BLUE}⚡ Habilitando APIs necessárias...${NC}"
APIS=(
    "artifactregistry.googleapis.com"
    "run.googleapis.com"
    "cloudbuild.googleapis.com"
    "cloudresourcemanager.googleapis.com"
    "iam.googleapis.com"
)

for api in "${APIS[@]}"; do
    echo -e "${YELLOW}   Habilitando: $api${NC}"
    gcloud services enable $api --quiet
done

echo -e "${GREEN}✅ APIs habilitadas${NC}"

# Criar conta de serviço
echo -e "${BLUE}👤 Criando conta de serviço...${NC}"
if gcloud iam service-accounts describe $SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com &>/dev/null; then
    echo -e "${YELLOW}⚠️  Conta de serviço já existe${NC}"
else
    gcloud iam service-accounts create $SERVICE_ACCOUNT_NAME \
        --description="Conta de serviço para GitHub Actions - Produção" \
        --display-name="$SERVICE_ACCOUNT_DISPLAY"
    echo -e "${GREEN}✅ Conta de serviço criada${NC}"
fi

SA_EMAIL="$SERVICE_ACCOUNT_NAME@$PROJECT_ID.iam.gserviceaccount.com"

# Atribuir permissões
echo -e "${BLUE}🔐 Atribuindo permissões...${NC}"
ROLES=(
    "roles/artifactregistry.admin"
    "roles/run.admin"
    "roles/iam.serviceAccountUser"
    "roles/storage.admin"
)

for role in "${ROLES[@]}"; do
    echo -e "${YELLOW}   Adicionando role: $role${NC}"
    gcloud projects add-iam-policy-binding $PROJECT_ID \
        --member="serviceAccount:$SA_EMAIL" \
        --role="$role" --quiet
done

echo -e "${GREEN}✅ Permissões atribuídas${NC}"

# Criar repositório Docker
echo -e "${BLUE}📦 Criando repositório Docker...${NC}"
if gcloud artifacts repositories describe $REPO_NAME --location=$REGION &>/dev/null; then
    echo -e "${YELLOW}⚠️  Repositório já existe${NC}"
else
    gcloud artifacts repositories create $REPO_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Repositório Docker para Fila API - Produção"
    echo -e "${GREEN}✅ Repositório criado${NC}"
fi

# Gerar chave JSON
echo -e "${BLUE}🔑 Gerando chave JSON...${NC}"
KEY_FILE="github-actions-prod-key.json"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL

echo -e "${GREEN}✅ Chave gerada: $KEY_FILE${NC}"

# Testar autenticação
echo -e "${BLUE}🧪 Testando autenticação...${NC}"
gcloud auth activate-service-account --key-file=$KEY_FILE

# Verificar configuração
echo -e "${BLUE}🔍 Verificando configuração...${NC}"
echo -e "${YELLOW}   Projeto: $(gcloud config get-value project)${NC}"
echo -e "${YELLOW}   Conta: $(gcloud config get-value account)${NC}"
echo -e "${YELLOW}   Repositórios:${NC}"
gcloud artifacts repositories list --location=$REGION

# Resumo
echo ""
echo -e "${GREEN}🎉 Setup concluído com sucesso!${NC}"
echo ""
echo -e "${BLUE}📋 Próximos passos:${NC}"
echo -e "1. Copie o conteúdo do arquivo '${KEY_FILE}' para o secret 'GCP_SA_KEY_PROD' no GitHub"
echo -e "2. Configure os outros secrets no GitHub:"
echo -e "   - GCP_PROJECT_ID_PROD=${PROJECT_ID}"
echo -e "   - GCP_REGION_PROD=${REGION}"
echo -e "   - BACKEND_SERVICE_NAME_PROD=agiliza-api-prod"
echo -e "   - DATABASE_URL_PROD=<sua-url-do-banco>"
echo -e "   - JWT_SECRET_PROD=<sua-chave-secreta>"
echo -e "   - E outras variáveis de ambiente necessárias"
echo ""
echo -e "${YELLOW}📝 Não se esqueça de remover o arquivo ${KEY_FILE} após configurar os secrets!${NC}"
echo ""
echo -e "${BLUE}🚀 Para testar o deploy:${NC}"
echo -e "   ./scripts/deploy-prod.sh ${PROJECT_ID} ${REGION}"
