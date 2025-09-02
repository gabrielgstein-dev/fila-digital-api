#!/bin/bash

# Script para configurar MCP server em outros projetos
# Uso: ./scripts/setup-mcp-for-project.sh <caminho-do-projeto> <tipo-do-projeto>

set -e

PROJECT_PATH=${1:-"."}
PROJECT_TYPE=${2:-"igniter"}

echo "🚀 Configurando MCP server para projeto em: $PROJECT_PATH"
echo "🔧 Tipo do projeto: $PROJECT_TYPE"

# Verificar se o diretório existe
if [ ! -d "$PROJECT_PATH" ]; then
    echo "❌ Diretório $PROJECT_PATH não existe"
    exit 1
fi

# Copiar arquivos necessários
echo "📁 Copiando arquivos MCP..."

# Criar diretório .cursor se não existir
mkdir -p "$PROJECT_PATH/.cursor"

# Copiar MCP server reutilizável
cp src/igniter/mcp-server-reusable.js "$PROJECT_PATH/"

# Copiar configuração personalizada se existir
if [ -f ".mcp-config.json" ]; then
    cp .mcp-config.json "$PROJECT_PATH/"
    echo "✅ Configuração personalizada copiada"
else
    # Criar configuração básica
    cat > "$PROJECT_PATH/.mcp-config.json" << EOF
{
  "name": "$(basename "$PROJECT_PATH")",
  "description": "MCP Server para $(basename "$PROJECT_PATH")",
  "version": "1.0.0",
  "projectType": "$PROJECT_TYPE",
  "customTools": [
    {
      "name": "list-endpoints",
      "description": "Lista todos os endpoints disponíveis na API",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    },
    {
      "name": "get-project-structure",
      "description": "Obtém a estrutura do projeto",
      "inputSchema": {
        "type": "object",
        "properties": {}
      }
    }
  ],
  "endpoints": {
    "baseUrl": "http://localhost:3000",
    "basePath": "/api/v1"
  }
}
EOF
    echo "✅ Configuração básica criada"
fi

# Criar configuração do Cursor
cat > "$PROJECT_PATH/.cursor/mcp.json" << EOF
{
  "mcpServers": {
    "$(basename "$PROJECT_PATH")": {
      "command": "node",
      "args": ["./mcp-server-reusable.js"],
      "env": {
        "NODE_ENV": "development",
        "DATABASE_URL": "file:./dev.db"
      }
    }
  }
}
EOF

echo "✅ Configuração do Cursor criada"

# Testar MCP server
echo "🧪 Testando MCP server..."
cd "$PROJECT_PATH"
if node mcp-server-reusable.js > /dev/null 2>&1; then
    echo "✅ MCP server funcionando corretamente"
else
    echo "⚠️ MCP server pode ter problemas, verifique manualmente"
fi

cd - > /dev/null

echo ""
echo "🎉 Configuração MCP concluída!"
echo ""
echo "📋 Próximos passos:"
echo "1. Abra o projeto no Cursor: $PROJECT_PATH"
echo "2. Reinicie o Cursor para carregar a configuração MCP"
echo "3. Verifique se o MCP server aparece em: Cmd/Ctrl + Shift + P → 'MCP: Show MCP Servers'"
echo "4. Teste com comandos como: 'Liste todos os endpoints da API'"
echo ""
echo "📁 Arquivos criados:"
echo "  - $PROJECT_PATH/mcp-server-reusable.js"
echo "  - $PROJECT_PATH/.mcp-config.json"
echo "  - $PROJECT_PATH/.cursor/mcp.json"
echo ""
echo "🔧 Para personalizar, edite: $PROJECT_PATH/.mcp-config.json"
