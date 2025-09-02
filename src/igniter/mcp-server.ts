// Configuração do MCP Server para Igniter.js
// Nota: A API do @igniter-js/mcp-server pode estar em desenvolvimento
// Esta é uma implementação básica que pode ser expandida

import { AppRouter } from './igniter.router';
import { createIgniterAppContext } from './igniter.context';

// Configuração básica do MCP server
const mcpServerConfig = {
  name: 'fila-api-igniter',
  description: 'MCP Server para API de Fila Digital com Igniter.js',
  version: '1.0.20-stage',
  router: AppRouter,
  context: createIgniterAppContext,
};

console.log('✅ MCP Server configurado:', mcpServerConfig.name);

export default mcpServerConfig;
