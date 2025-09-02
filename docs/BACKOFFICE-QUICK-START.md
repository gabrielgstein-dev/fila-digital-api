# Quick Start: Igniter.js no Fila Backoffice

## 🚀 Setup em 5 Minutos

### 1. Executar Script Automático

```bash
# No diretório fila-api
./scripts/setup-igniter-backoffice.sh
```

### 2. Iniciar Serviços

```bash
# Terminal 1: Next.js (Frontend)
cd ../fila-backoffice
pnpm run dev

# Terminal 2: Igniter.js (APIs)
cd ../fila-backoffice
pnpm run igniter:dev
```

### 3. Testar Integração

```bash
# Testar health check
curl http://localhost:3001/api/igniter/api/health

# Resposta esperada:
# {
#   "status": "ok",
#   "timestamp": "2024-09-02T19:30:00.000Z",
#   "service": "fila-backoffice"
# }
```

### 4. Configurar Cursor

1. Reiniciar o Cursor
2. Verificar MCP Servers: `Cmd/Ctrl + Shift + P` → "MCP: Show MCP Servers"
3. Deve aparecer "fila-backoffice"

## 🎯 Estrutura Criada

```
fila-backoffice/
├── src/igniter/                    # 🆕 Igniter.js
│   ├── context.ts                  # Contexto da aplicação
│   ├── router.ts                   # Router principal
│   ├── main.ts                     # Servidor HTTP
│   ├── mcp-server-reusable.js      # MCP Server
│   └── controllers/
│       └── api.controller.ts       # Controlador básico
├── .cursor/mcp.json               # 🆕 Configuração Cursor
├── .mcp-config.json               # 🆕 Configuração MCP
└── tsconfig.igniter.json          # 🆕 TSConfig Igniter.js
```

## 🔧 URLs Importantes

- **Next.js Frontend**: http://localhost:3000
- **Igniter.js APIs**: http://localhost:3001
- **Health Check**: http://localhost:3001/api/igniter/api/health
- **MCP Server**: Configurado no Cursor

## 🎉 Pronto!

Agora você tem:
- ✅ Igniter.js rodando no backoffice
- ✅ MCP Server configurado no Cursor
- ✅ APIs tipadas e validadas
- ✅ Integração com IA

## 📚 Próximos Passos

1. **Adicionar Controladores**: Criar mais endpoints em `src/igniter/controllers/`
2. **Integrar com Next.js**: Usar hooks para consumir APIs
3. **Personalizar MCP**: Adicionar ferramentas específicas
4. **Documentar APIs**: Swagger automático do Igniter.js

Veja a documentação completa em: [Guia de Migração](MIGRATION-BACKOFFICE-GUIDE.md)
