#!/bin/bash

# Script para configurar ambiente QA no GCP
# Execute: chmod +x scripts/setup-gcp-qa.sh && ./scripts/setup-gcp-qa.sh

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
PROJECT_ID="fila-digital-qa"
REGION="europe-west1"
SERVICE_NAME="fila-api-qa"
REPOSITORY_NAME="fila-api"

echo -e "${BLUE}🚀 Configurando ambiente QA no GCP${NC}"
echo -e "${BLUE}Projeto: ${PROJECT_ID}${NC}"
echo -e "${BLUE}Região: ${REGION}${NC}"

# Verificar se está logado no gcloud
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q "."; then
    echo -e "${RED}❌ Você não está logado no gcloud. Execute: gcloud auth login${NC}"
    exit 1
fi

# Configurar projeto
echo -e "${YELLOW}📋 Configurando projeto...${NC}"
gcloud config set project $PROJECT_ID

# Verificar se o projeto existe
if ! gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo -e "${RED}❌ Projeto $PROJECT_ID não encontrado. Verifique se o projeto existe.${NC}"
    exit 1
fi

# Habilitar APIs necessárias
echo -e "${YELLOW}🔧 Habilitando APIs necessárias...${NC}"
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable artifactregistry.googleapis.com

# Criar Artifact Registry (se não existir)
echo -e "${YELLOW}📦 Configurando Artifact Registry...${NC}"
if ! gcloud artifacts repositories describe $REPOSITORY_NAME --location=$REGION &>/dev/null; then
    gcloud artifacts repositories create $REPOSITORY_NAME \
        --repository-format=docker \
        --location=$REGION \
        --description="Repositório Docker para API Fila Digital QA"
    echo -e "${GREEN}✅ Artifact Registry criado${NC}"
else
    echo -e "${GREEN}✅ Artifact Registry já existe${NC}"
fi

# Configurar Docker para Artifact Registry
echo -e "${YELLOW}🐳 Configurando Docker...${NC}"
gcloud auth configure-docker $REGION-docker.pkg.dev

# Criar Service Account para GitHub Actions (se não existir)
SA_NAME="github-actions-qa"
SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo -e "${YELLOW}👤 Configurando Service Account...${NC}"
if ! gcloud iam service-accounts describe $SA_EMAIL &>/dev/null; then
    gcloud iam service-accounts create $SA_NAME \
        --display-name="GitHub Actions QA" \
        --description="Service Account para deploys automáticos QA"
    echo -e "${GREEN}✅ Service Account criado${NC}"
else
    echo -e "${GREEN}✅ Service Account já existe${NC}"
fi

# Adicionar permissões ao Service Account
echo -e "${YELLOW}🔑 Configurando permissões...${NC}"
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/run.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/storage.admin"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$SA_EMAIL" \
    --role="roles/iam.serviceAccountUser"

# Gerar chave do Service Account
KEY_FILE="github-actions-qa-key.json"
echo -e "${YELLOW}🔐 Gerando chave do Service Account...${NC}"
gcloud iam service-accounts keys create $KEY_FILE \
    --iam-account=$SA_EMAIL

echo -e "${GREEN}✅ Chave gerada: $KEY_FILE${NC}"

# Mostrar instruções finais
echo -e "\n${GREEN}🎉 Configuração concluída!${NC}\n"

echo -e "${BLUE}📋 Próximos passos:${NC}"
echo -e "1. ${YELLOW}Adicione os seguintes secrets no GitHub:${NC}"
echo -e "   - ${BLUE}GCP_SA_KEY_QA${NC}: Conteúdo do arquivo $KEY_FILE"
echo -e "   - ${BLUE}DATABASE_URL_QA${NC}: URL do Postgres no Render"
echo -e "   - ${BLUE}JWT_SECRET_QA${NC}: Secret JWT para QA"
echo -e "   - ${BLUE}REDIS_URL_QA${NC}: URL do Redis (opcional)"
echo -e "   - ${BLUE}CORS_ORIGIN_QA${NC}: URL do frontend QA"
echo -e "   - ${BLUE}WEBSOCKET_CORS_ORIGIN_QA${NC}: URL do frontend QA"

echo -e "\n2. ${YELLOW}Comando para ver o conteúdo da chave:${NC}"
echo -e "   ${BLUE}cat $KEY_FILE${NC}"

echo -e "\n3. ${YELLOW}URLs importantes:${NC}"
echo -e "   - Artifact Registry: https://console.cloud.google.com/artifacts/docker/$PROJECT_ID/$REGION/$REPOSITORY_NAME"
echo -e "   - Cloud Run: https://console.cloud.google.com/run"
echo -e "   - IAM: https://console.cloud.google.com/iam-admin/iam"

echo -e "\n4. ${YELLOW}Para testar o deploy manualmente:${NC}"
echo -e "   ${BLUE}gcloud run deploy $SERVICE_NAME --source . --region $REGION${NC}"

echo -e "\n${GREEN}🔒 IMPORTANTE: Adicione $KEY_FILE ao .gitignore e delete após usar!${NC}"

# Adicionar ao .gitignore se não estiver lá
if ! grep -q "$KEY_FILE" .gitignore 2>/dev/null; then
    echo "$KEY_FILE" >> .gitignore
    echo -e "${GREEN}✅ $KEY_FILE adicionado ao .gitignore${NC}"
fi 