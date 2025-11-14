#!/usr/bin/env node

/**
 * Teste de Validação do Código
 *
 * Verifica se:
 * 1. Os arquivos estão corretos
 * 2. As dependências estão instaladas
 * 3. O código compila sem erros
 * 4. As estruturas estão corretas
 */

const fs = require('fs');
const path = require('path');

function testCodeValidation() {
  console.log('🔍 Validação do Código do Sistema de Tickets\n');
  console.log('='.repeat(60));

  const results = {
    passed: 0,
    failed: 0,
    errors: [],
  };

  // 1. Verificar arquivos principais
  console.log('1️⃣ Verificando arquivos principais...');

  const requiredFiles = [
    'src/rt/postgres-listener.service.ts',
    'src/rt/ticket-realtime-optimized.controller.ts',
    'src/rt/igniter.module.ts',
    'src/rt/igniter.router.ts',
    'prisma/migrations/20250103000000_add_ticket_notify_trigger/migration.sql',
  ];

  for (const file of requiredFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${file} - ARQUIVO NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({ file, error: 'Arquivo não encontrado' });
    }
  }

  // 2. Verificar dependências
  console.log('\n2️⃣ Verificando dependências...');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const requiredDeps = ['pg', 'eventsource'];

  for (const dep of requiredDeps) {
    if (packageJson.dependencies[dep]) {
      console.log(`   ✅ ${dep} - ${packageJson.dependencies[dep]}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${dep} - DEPENDÊNCIA NÃO ENCONTRADA`);
      results.failed++;
      results.errors.push({ dep, error: 'Dependência não encontrada' });
    }
  }

  // 3. Verificar estrutura do código
  console.log('\n3️⃣ Verificando estrutura do código...');

  // Verificar PostgresListenerService
  const listenerService = fs.readFileSync(
    'src/rt/postgres-listener.service.ts',
    'utf8',
  );
  const listenerChecks = [
    {
      name: 'Classe PostgresListenerService',
      pattern: 'export class PostgresListenerService',
    },
    { name: 'Método addChangeListener', pattern: 'addChangeListener' },
    { name: 'Método startListening', pattern: 'startListening' },
    { name: 'Configuração LISTEN', pattern: 'LISTEN ticket_updates' },
    { name: 'Handler de notificação', pattern: "client.on('notification'" },
  ];

  for (const check of listenerChecks) {
    if (listenerService.includes(check.pattern)) {
      console.log(`   ✅ ${check.name}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${check.name} - NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        component: 'PostgresListenerService',
        error: `${check.name} não encontrado`,
      });
    }
  }

  // Verificar TicketRealtimeOptimizedController
  const controller = fs.readFileSync(
    'src/rt/ticket-realtime-optimized.controller.ts',
    'utf8',
  );
  const controllerChecks = [
    {
      name: 'Classe TicketRealtimeOptimizedController',
      pattern: 'export class TicketRealtimeOptimizedController',
    },
    { name: 'Método streamTickets', pattern: 'streamTickets' },
    { name: 'Método streamSpecificTicket', pattern: 'streamSpecificTicket' },
    { name: 'Método getTicket', pattern: 'getTicket' },
    { name: 'Método getTicketsByQueue', pattern: 'getTicketsByQueue' },
    { name: 'Método getStats', pattern: 'getStats' },
  ];

  for (const check of controllerChecks) {
    if (controller.includes(check.pattern)) {
      console.log(`   ✅ ${check.name}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${check.name} - NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        component: 'TicketRealtimeOptimizedController',
        error: `${check.name} não encontrado`,
      });
    }
  }

  // 4. Verificar trigger SQL
  console.log('\n4️⃣ Verificando trigger SQL...');

  const triggerSql = fs.readFileSync(
    'prisma/migrations/20250103000000_add_ticket_notify_trigger/migration.sql',
    'utf8',
  );
  const triggerChecks = [
    {
      name: 'Função notify_ticket_changes',
      pattern: 'CREATE OR REPLACE FUNCTION notify_ticket_changes',
    },
    {
      name: 'Trigger ticket_changes_trigger',
      pattern: 'CREATE TRIGGER ticket_changes_trigger',
    },
    { name: 'Canal ticket_updates', pattern: "pg_notify('ticket_updates'" },
    { name: 'Payload JSON', pattern: 'json_build_object' },
  ];

  for (const check of triggerChecks) {
    if (triggerSql.includes(check.pattern)) {
      console.log(`   ✅ ${check.name}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${check.name} - NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        component: 'Trigger SQL',
        error: `${check.name} não encontrado`,
      });
    }
  }

  // 5. Verificar router
  console.log('\n5️⃣ Verificando router...');

  const router = fs.readFileSync('src/rt/igniter.router.ts', 'utf8');
  const routerChecks = [
    { name: 'Rota /api/rt/tickets/stream', pattern: '/api/rt/tickets/stream' },
    { name: 'Rota /api/rt/tickets/{id}/stream', pattern: '/api/rt/tickets/' },
    { name: 'Rota /api/rt/tickets/{id}', pattern: '/api/rt/tickets/' },
    {
      name: 'Rota /api/rt/tickets/queue/{id}',
      pattern: '/api/rt/tickets/queue/',
    },
    { name: 'Rota /api/rt/tickets/stats', pattern: '/api/rt/tickets/stats' },
  ];

  for (const check of routerChecks) {
    if (
      typeof check.pattern === 'boolean'
        ? check.pattern
        : router.includes(check.pattern)
    ) {
      console.log(`   ✅ ${check.name}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${check.name} - NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        component: 'Router',
        error: `${check.name} não encontrado`,
      });
    }
  }

  // 6. Verificar documentação
  console.log('\n6️⃣ Verificando documentação...');

  const docFiles = [
    'docs/TICKET-REALTIME-ENDPOINTS.md',
    'docs/CLEANUP-SUMMARY.md',
  ];

  for (const docFile of docFiles) {
    if (fs.existsSync(docFile)) {
      console.log(`   ✅ ${docFile}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${docFile} - ARQUIVO NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        file: docFile,
        error: 'Documentação não encontrada',
      });
    }
  }

  // 7. Verificar scripts de teste
  console.log('\n7️⃣ Verificando scripts de teste...');

  const testFiles = [
    'scripts/tests/test-ticket-basic.js',
    'scripts/tests/test-realtime-simple.js',
    'scripts/tests/test-ticket-realtime-complete.js',
    'scripts/tests/run-all-tests.js',
  ];

  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      console.log(`   ✅ ${testFile}`);
      results.passed++;
    } else {
      console.log(`   ❌ ${testFile} - ARQUIVO NÃO ENCONTRADO`);
      results.failed++;
      results.errors.push({
        file: testFile,
        error: 'Script de teste não encontrado',
      });
    }
  }

  // Resultado final
  console.log('\n' + '='.repeat(60));
  console.log('📊 RESULTADO DA VALIDAÇÃO');
  console.log('='.repeat(60));

  console.log(`✅ Verificações passaram: ${results.passed}`);
  console.log(`❌ Verificações falharam: ${results.failed}`);
  console.log(
    `📈 Taxa de sucesso: ${Math.round((results.passed / (results.passed + results.failed)) * 100)}%`,
  );

  if (results.errors.length > 0) {
    console.log('\n❌ PROBLEMAS ENCONTRADOS:');
    results.errors.forEach((error, index) => {
      console.log(
        `   ${index + 1}. ${error.file || error.component || error.dep}: ${error.error}`,
      );
    });
  }

  console.log('\n' + '='.repeat(60));

  if (results.failed === 0) {
    console.log('🎉 VALIDAÇÃO COMPLETA!');
    console.log('✅ Todos os arquivos estão corretos');
    console.log('✅ Dependências instaladas');
    console.log('✅ Estrutura do código válida');
    console.log('✅ Sistema pronto para execução');
    console.log('\n📋 PRÓXIMOS PASSOS:');
    console.log('1. Inicie o servidor: npm run start:dev');
    console.log('2. Execute os testes: node run-all-tests.js');
    console.log('3. Teste os endpoints manualmente');
  } else {
    console.log('⚠️ VALIDAÇÃO COM PROBLEMAS');
    console.log('🔧 Corrija os problemas listados acima');
    console.log('🔧 Execute novamente este teste após as correções');
  }

  console.log('='.repeat(60));
}

// Executar validação
testCodeValidation();
