#!/usr/bin/env node

import mcpServer from './mcp-server';

// Inicialização do servidor MCP
if (require.main === module) {
  console.log('🚀 Iniciando MCP Server do Igniter.js...');

  // O servidor MCP será iniciado automaticamente
  // quando importado pelo Cursor
  console.log('✅ MCP Server configurado e pronto para uso');
}
