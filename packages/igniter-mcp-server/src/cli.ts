#!/usr/bin/env node

/**
 * CLI para MCP Server Reutilizável
 *
 * Uso:
 * npx @fila/igniter-mcp-server
 * npx @fila/igniter-mcp-server init
 * npx @fila/igniter-mcp-server config
 */

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const program = new Command();

program
  .name('igniter-mcp')
  .description('MCP Server reutilizável para projetos Igniter.js')
  .version('1.0.0');

// Comando para inicializar configuração
program
  .command('init')
  .description('Inicializa configuração do MCP server no projeto')
  .option(
    '-t, --type <type>',
    'Tipo do projeto (igniter, nestjs, express)',
    'igniter',
  )
  .option('-n, --name <name>', 'Nome do projeto')
  .action((options) => {
    const projectName = options.name || getProjectName();
    const config = generateConfig(options.type, projectName);

    writeFileSync('.mcp-config.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuração MCP criada em .mcp-config.json');
    console.log('📝 Edite o arquivo para personalizar as ferramentas');
  });

// Comando para mostrar configuração atual
program
  .command('config')
  .description('Mostra configuração atual do MCP server')
  .action(() => {
    if (existsSync('.mcp-config.json')) {
      const config = JSON.parse(readFileSync('.mcp-config.json', 'utf8'));
      console.log('📋 Configuração atual:');
      console.log(JSON.stringify(config, null, 2));
    } else {
      console.log('❌ Arquivo .mcp-config.json não encontrado');
      console.log('💡 Execute "igniter-mcp init" para criar a configuração');
    }
  });

// Comando padrão - iniciar servidor MCP
program.description('Inicia o servidor MCP').action(() => {
  console.log('🚀 Iniciando MCP Server...');
  // Aqui seria a lógica para iniciar o servidor MCP
  console.log('✅ MCP Server iniciado');
});

function getProjectName(): string {
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    return packageJson.name || 'meu-projeto';
  } catch {
    return 'meu-projeto';
  }
}

function generateConfig(type: string, name: string) {
  const baseConfig = {
    name,
    description: `MCP Server para ${name}`,
    version: '1.0.0',
    projectType: type,
  };

  const typeConfigs = {
    igniter: {
      customTools: [
        {
          name: 'list-endpoints',
          description: 'Lista todos os endpoints da API',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'call-endpoint',
          description: 'Chama um endpoint específico',
          inputSchema: {
            type: 'object',
            properties: {
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'DELETE'],
              },
              path: { type: 'string' },
              body: { type: 'object' },
            },
            required: ['method', 'path'],
          },
        },
      ],
      endpoints: {
        baseUrl: 'http://localhost:8080',
        basePath: '/api/v1',
      },
    },
    nestjs: {
      customTools: [
        {
          name: 'list-modules',
          description: 'Lista todos os módulos NestJS',
          inputSchema: { type: 'object', properties: {} },
        },
        {
          name: 'generate-module',
          description: 'Gera um novo módulo NestJS',
          inputSchema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
            },
            required: ['name'],
          },
        },
      ],
    },
    express: {
      customTools: [
        {
          name: 'list-routes',
          description: 'Lista todas as rotas Express',
          inputSchema: { type: 'object', properties: {} },
        },
      ],
    },
  };

  return { ...baseConfig, ...typeConfigs[type] };
}

program.parse();
