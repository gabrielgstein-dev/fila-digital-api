#!/usr/bin/env node

/**
 * MCP Server Reutilizável para Projetos Igniter.js
 *
 * Este servidor pode ser compartilhado entre diferentes projetos
 * Configuração via variáveis de ambiente e arquivos de configuração
 */

const fs = require('fs');
const path = require('path');

// Configuração padrão
const DEFAULT_CONFIG = {
  name: 'igniter-mcp-server',
  description: 'MCP Server reutilizável para projetos Igniter.js',
  version: '1.0.0',
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
      name: 'get-project-structure',
      description: 'Obtém a estrutura do projeto',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
    {
      name: 'get-project-info',
      description: 'Obtém informações básicas do projeto',
      inputSchema: {
        type: 'object',
        properties: {},
      },
    },
  ],
};

// Carregar configuração personalizada
function loadProjectConfig() {
  const configPath = path.join(process.cwd(), '.mcp-config.json');

  if (fs.existsSync(configPath)) {
    try {
      const customConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ...DEFAULT_CONFIG, ...customConfig };
    } catch (error) {
      console.warn(
        '⚠️ Erro ao carregar .mcp-config.json, usando configuração padrão',
      );
    }
  }

  return DEFAULT_CONFIG;
}

// Detectar tipo de projeto
function detectProjectType() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      if (packageJson.dependencies?.['@igniter-js/core']) {
        return 'igniter';
      } else if (packageJson.dependencies?.['@nestjs/core']) {
        return 'nestjs';
      } else if (packageJson.dependencies?.['express']) {
        return 'express';
      } else if (packageJson.dependencies?.['fastify']) {
        return 'fastify';
      }
    } catch (error) {
      console.warn('⚠️ Erro ao ler package.json');
    }
  }

  return 'unknown';
}

// Listar endpoints baseado no tipo de projeto
function listEndpoints(projectType) {
  const endpoints = {
    igniter: [
      'GET /api/v1/health - Health check',
      'POST /api/v1/auth/login - Login de usuário',
      'GET /api/v1/auth/google - Login com Google',
      'POST /api/v1/auth/google/token - Login móvel Google',
    ],
    nestjs: [
      'GET /api/v1/health - Health check',
      'POST /api/v1/auth/login - Login de usuário',
      'GET /api/v1/tenants - Listar tenants',
      'POST /api/v1/tenants - Criar tenant',
      'GET /api/v1/queues - Listar filas',
      'POST /api/v1/queues - Criar fila',
      'GET /api/v1/tickets - Listar tickets',
      'POST /api/v1/tickets - Criar ticket',
    ],
    express: ['GET /health - Health check', 'GET /api/* - Endpoints da API'],
    fastify: ['GET /health - Health check', 'GET /api/* - Endpoints da API'],
    unknown: [
      'Endpoints não detectados automaticamente',
      'Verifique a documentação do projeto',
    ],
  };

  return {
    projectType,
    endpoints: endpoints[projectType] || endpoints.unknown,
    total: endpoints[projectType]?.length || 0,
  };
}

// Obter estrutura do projeto
function getProjectStructure() {
  const projectRoot = process.cwd();
  const structure = {
    name: path.basename(projectRoot),
    type: detectProjectType(),
    root: projectRoot,
    directories: [],
    files: [],
  };

  try {
    const items = fs.readdirSync(projectRoot, { withFileTypes: true });

    items.forEach((item) => {
      if (
        item.isDirectory() &&
        !item.name.startsWith('.') &&
        item.name !== 'node_modules'
      ) {
        structure.directories.push(item.name);
      } else if (item.isFile() && item.name.endsWith('.json')) {
        structure.files.push(item.name);
      }
    });
  } catch (error) {
    console.warn('⚠️ Erro ao ler estrutura do projeto');
  }

  return structure;
}

// Obter informações do projeto
function getProjectInfo() {
  const packageJsonPath = path.join(process.cwd(), 'package.json');
  const info = {
    name: 'Projeto não identificado',
    version: '1.0.0',
    description: 'Sem descrição',
    type: detectProjectType(),
    dependencies: {},
    scripts: {},
  };

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      info.name = packageJson.name || info.name;
      info.version = packageJson.version || info.version;
      info.description = packageJson.description || info.description;
      info.dependencies = packageJson.dependencies || {};
      info.scripts = packageJson.scripts || {};
    } catch (error) {
      console.warn('⚠️ Erro ao ler package.json');
    }
  }

  return info;
}

// Função principal
function main() {
  const config = loadProjectConfig();
  const projectType = detectProjectType();

  console.log('🚀 Iniciando MCP Server Reutilizável...');
  console.log(`📦 Projeto: ${config.name}`);
  console.log(`🔧 Tipo: ${projectType}`);
  console.log(`📋 Ferramentas: ${config.tools.map((t) => t.name).join(', ')}`);

  // Exportar funções para uso pelo MCP
  return {
    config,
    projectType,
    listEndpoints: () => listEndpoints(projectType),
    getProjectStructure,
    getProjectInfo,
  };
}

// Executar se chamado diretamente
if (require.main === module) {
  const mcpServer = main();
  console.log('✅ MCP Server reutilizável configurado e pronto!');
  console.log(`🎯 Endpoints detectados: ${mcpServer.listEndpoints().total}`);
}

module.exports = {
  main,
  loadProjectConfig,
  detectProjectType,
  listEndpoints,
  getProjectStructure,
  getProjectInfo,
  DEFAULT_CONFIG,
};
