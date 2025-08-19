#!/bin/bash

# Script para testar deploy QA

set -e

echo "🚀 === TESTANDO DEPLOY QA ==="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script na raiz do projeto (onde está o package.json)"
    exit 1
fi

echo "📋 Verificando configuração..."

# Verificar se está no git
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "❌ Este não é um repositório git"
    exit 1
fi

# Verificar branch atual
CURRENT_BRANCH=$(git branch --show-current)
echo "🌿 Branch atual: $CURRENT_BRANCH"

echo ""
echo "📋 Opções para testar o deploy:"
echo ""
echo "1️⃣  Criar branch 'qa' e fazer push (recomendado para teste)"
echo "2️⃣  Fazer push para branch 'develop'"
echo "3️⃣  Executar workflow manualmente no GitHub"
echo ""

read -p "Escolha uma opção (1-3): " choice

case $choice in
    1)
        echo "🔄 Criando branch 'qa'..."
        git checkout -b qa 2>/dev/null || git checkout qa
        echo "📤 Fazendo push para branch qa..."
        git push -u origin qa
        echo "✅ Push realizado! O workflow deve executar automaticamente."
        ;;
    2)
        echo "🔄 Mudando para branch develop..."
        git checkout -b develop 2>/dev/null || git checkout develop
        git merge main
        echo "📤 Fazendo push para branch develop..."
        git push -u origin develop
        echo "✅ Push realizado! O workflow deve executar automaticamente."
        ;;
    3)
        echo "📋 Para executar manualmente:"
        echo "1. Acesse: https://github.com/gabrielgstein-dev/fila-digital-api/actions"
        echo "2. Clique em 'Deploy to Cloud Run - QA'"
        echo "3. Clique em 'Run workflow'"
        echo "4. Selecione a branch e clique em 'Run workflow'"
        ;;
    *)
        echo "❌ Opção inválida"
        exit 1
        ;;
esac

echo ""
echo "📊 === PRÓXIMOS PASSOS ==="
echo ""
echo "🔍 Para acompanhar o deploy:"
echo "   https://github.com/gabrielgstein-dev/fila-digital-api/actions"
echo ""
echo "☁️  Para ver no Cloud Run:"
echo "   https://console.cloud.google.com/run?project=fila-digital-qa"
echo ""
echo "📋 Se o deploy falhar, verifique:"
echo "   ✅ Secrets configurados no GitHub"
echo "   ✅ Projeto GCP 'fila-digital-qa' existe"
echo "   ✅ Service Account tem permissões"
echo "   ✅ Artifact Registry configurado"
echo ""
