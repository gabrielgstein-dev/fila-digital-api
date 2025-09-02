#!/usr/bin/env node

// MCP Server para Fila API com Igniter.js
// Versão JavaScript para compatibilidade com Cursor

const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando MCP Server do Igniter.js...');

// Configuração básica do MCP server
const mcpServerConfig = {
  name: 'fila-api-igniter',
  description: 'MCP Server para API de Fila Digital com Igniter.js',
  version: '1.0.20-stage',
  tools: [
    {
      name: 'list-endpoints',
      description: 'Lista todos os endpoints disponíveis na API',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'call-auth-login',
      description: 'Executa login de usuário corporativo',
      inputSchema: {
        type: 'object',
        properties: {
          email: { type: 'string', description: 'Email do usuário' },
          password: { type: 'string', description: 'Senha do usuário' },
        },
        required: ['email', 'password'],
      },
    },
    {
      name: 'get-project-structure',
      description: 'Obtém a estrutura do projeto',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
};

// Função para listar endpoints
function listEndpoints() {
  return {
    endpoints: [
      'POST /api/v1/auth/login - Login de usuário corporativo',
      'POST /api/v1/auth/agent/login - Login de agente',
      'POST /api/v1/auth/client/login - Login de cliente',
      'GET /api/v1/auth/google - Iniciar login com Google',
      'GET /api/v1/auth/google/callback - Callback do Google',
      'POST /api/v1/auth/google/token - Login móvel com token Google',
    ],
  };
}

// Função para obter estrutura do projeto
function getProjectStructure() {
  const projectRoot = path.join(__dirname, '../..');
  const igniterPath = path.join(__dirname);
  
  return {
    project: {
      name: 'fila-api',
      framework: 'Igniter.js + NestJS (migração em andamento)',
      structure: {
        'src/igniter/': 'Nova estrutura com Igniter.js',
        'src/auth/': 'Módulo de autenticação (NestJS)',
        'src/tenants/': 'Módulo de tenants (NestJS)',
        'src/tickets/': 'Módulo de tickets (NestJS)',
        'src/queues/': 'Módulo de filas (NestJS)',
        'src/agents/': 'Módulo de agentes (NestJS)',
        'src/clients/': 'Módulo de clientes (NestJS)',
      },
    },
  };
}

console.log('✅ MCP Server configurado:', mcpServerConfig.name);
console.log('📋 Ferramentas disponíveis:', mcpServerConfig.tools.map(t => t.name).join(', '));

// Exportar configuração para uso
module.exports = {
  mcpServerConfig,
  listEndpoints,
  getProjectStructure,
};
