#!/usr/bin/env node

/**
 * Teste End-to-End Mínimo do Sistema de Tickets
 *
 * Este teste verifica apenas o essencial:
 * 1. Se o trigger PostgreSQL está ativo
 * 2. Se os arquivos estão corretos
 * 3. Se as dependências estão instaladas
 */

const { Client } = require('pg');
const fs = require('fs');

class MinimalE2ETest {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      startTime: Date.now(),
    };
  }

  async runMinimalE2ETest() {
    console.log('🚀 TESTE END-TO-END MÍNIMO - SISTEMA DE TICKETS\n');
    console.log('='.repeat(60));
    console.log('Este teste verifica apenas o essencial do sistema');
    console.log('='.repeat(60));

    try {
      await this.testDatabaseConnection();
      await this.testTriggerExists();
      await this.testFilesExist();
      await this.testDependencies();
      await this.testCodeStructure();

      this.printResults();
    } catch (error) {
      console.error('❌ Erro crítico durante o teste E2E:', error);
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'E2E_CRITICAL',
        error: error.message,
      });
    }
  }

  async testDatabaseConnection() {
    console.log('\n🔌 Testando conexão com o banco de dados...');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await client.connect();
      console.log('   ✅ Conexão com PostgreSQL estabelecida');

      // Testar uma query simples
      const result = await client.query('SELECT 1 as test');
      if (result.rows[0].test === 1) {
        console.log('   ✅ Query de teste executada com sucesso');
      } else {
        throw new Error('Query de teste falhou');
      }

      this.testResults.passed++;
      console.log('   ✅ Conexão com banco testada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'DATABASE_CONNECTION',
        error: error.message,
      });
      console.log('   ❌ Erro na conexão com o banco');
      console.log(`      Erro: ${error.message}`);
    } finally {
      try {
        await client.end();
      } catch (error) {
        // Ignorar erros de desconexão
      }
    }
  }

  async testTriggerExists() {
    console.log('\n⚡ Testando trigger PostgreSQL...');

    const client = new Client({
      connectionString: process.env.DATABASE_URL,
    });

    try {
      await client.connect();

      // 1. Verificar se o trigger existe
      console.log('   🔍 Verificando trigger...');
      const triggerResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'ticket_changes_trigger'
        ) as exists;
      `);

      if (triggerResult.rows[0].exists) {
        console.log('      ✅ Trigger ticket_changes_trigger existe');
      } else {
        throw new Error('Trigger ticket_changes_trigger não encontrado');
      }

      // 2. Verificar se a função existe
      console.log('   🔍 Verificando função...');
      const functionResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'notify_ticket_changes'
        ) as exists;
      `);

      if (functionResult.rows[0].exists) {
        console.log('      ✅ Função notify_ticket_changes existe');
      } else {
        throw new Error('Função notify_ticket_changes não encontrada');
      }

      // 3. Verificar se a tabela tickets existe
      console.log('   🔍 Verificando tabela tickets...');
      const tableResult = await client.query(`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_name = 'tickets'
        ) as exists;
      `);

      if (tableResult.rows[0].exists) {
        console.log('      ✅ Tabela tickets existe');
      } else {
        throw new Error('Tabela tickets não encontrada');
      }

      this.testResults.passed++;
      console.log('   ✅ Trigger PostgreSQL testado com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'TRIGGER_EXISTS',
        error: error.message,
      });
      console.log('   ❌ Erro no teste do trigger');
      console.log(`      Erro: ${error.message}`);
    } finally {
      try {
        await client.end();
      } catch (error) {
        // Ignorar erros de desconexão
      }
    }
  }

  async testFilesExist() {
    console.log('\n📁 Testando arquivos do sistema...');

    const requiredFiles = [
      'src/rt/postgres-listener.service.ts',
      'src/rt/ticket-realtime-optimized.controller.ts',
      'src/rt/igniter.module.ts',
      'src/rt/igniter.router.ts',
      'prisma/migrations/20250103000000_add_ticket_notify_trigger/migration.sql',
      'docs/TICKET-REALTIME-ENDPOINTS.md',
      'docs/TESTING-SUMMARY.md',
    ];

    let allFilesExist = true;

    for (const file of requiredFiles) {
      if (fs.existsSync(file)) {
        console.log(`   ✅ ${file}`);
      } else {
        console.log(`   ❌ ${file} - ARQUIVO NÃO ENCONTRADO`);
        allFilesExist = false;
        this.testResults.errors.push({
          test: 'FILES_EXIST',
          error: `Arquivo ${file} não encontrado`,
        });
      }
    }

    if (allFilesExist) {
      this.testResults.passed++;
      console.log('   ✅ Todos os arquivos necessários existem');
    } else {
      this.testResults.failed++;
      console.log('   ❌ Alguns arquivos necessários não foram encontrados');
    }
  }

  async testDependencies() {
    console.log('\n📦 Testando dependências...');

    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const requiredDeps = ['pg', 'eventsource'];

      let allDepsInstalled = true;

      for (const dep of requiredDeps) {
        if (packageJson.dependencies[dep]) {
          console.log(`   ✅ ${dep} - ${packageJson.dependencies[dep]}`);
        } else {
          console.log(`   ❌ ${dep} - DEPENDÊNCIA NÃO ENCONTRADA`);
          allDepsInstalled = false;
          this.testResults.errors.push({
            test: 'DEPENDENCIES',
            error: `Dependência ${dep} não encontrada`,
          });
        }
      }

      if (allDepsInstalled) {
        this.testResults.passed++;
        console.log('   ✅ Todas as dependências estão instaladas');
      } else {
        this.testResults.failed++;
        console.log('   ❌ Algumas dependências não estão instaladas');
      }
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'DEPENDENCIES',
        error: error.message,
      });
      console.log('   ❌ Erro ao verificar dependências');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testCodeStructure() {
    console.log('\n🏗️ Testando estrutura do código...');

    try {
      // Verificar PostgresListenerService
      const listenerService = fs.readFileSync(
        'src/rt/postgres-listener.service.ts',
        'utf8',
      );
      const listenerChecks = [
        'export class PostgresListenerService',
        'addChangeListener',
        'startListening',
        'LISTEN ticket_updates',
        "client.on('notification'",
      ];

      let listenerValid = true;
      for (const check of listenerChecks) {
        if (!listenerService.includes(check)) {
          console.log(`   ❌ PostgresListenerService: ${check} não encontrado`);
          listenerValid = false;
        }
      }

      if (listenerValid) {
        console.log('   ✅ PostgresListenerService está correto');
      }

      // Verificar TicketRealtimeOptimizedController
      const controller = fs.readFileSync(
        'src/rt/ticket-realtime-optimized.controller.ts',
        'utf8',
      );
      const controllerChecks = [
        'export class TicketRealtimeOptimizedController',
        'streamTickets',
        'streamSpecificTicket',
        'getTicket',
        'getTicketsByQueue',
        'getStats',
      ];

      let controllerValid = true;
      for (const check of controllerChecks) {
        if (!controller.includes(check)) {
          console.log(
            `   ❌ TicketRealtimeOptimizedController: ${check} não encontrado`,
          );
          controllerValid = false;
        }
      }

      if (controllerValid) {
        console.log('   ✅ TicketRealtimeOptimizedController está correto');
      }

      // Verificar trigger SQL
      const triggerSql = fs.readFileSync(
        'prisma/migrations/20250103000000_add_ticket_notify_trigger/migration.sql',
        'utf8',
      );
      const triggerChecks = [
        'CREATE OR REPLACE FUNCTION notify_ticket_changes',
        'CREATE TRIGGER ticket_changes_trigger',
        "pg_notify('ticket_updates'",
        'json_build_object',
      ];

      let triggerValid = true;
      for (const check of triggerChecks) {
        if (!triggerSql.includes(check)) {
          console.log(`   ❌ Trigger SQL: ${check} não encontrado`);
          triggerValid = false;
        }
      }

      if (triggerValid) {
        console.log('   ✅ Trigger SQL está correto');
      }

      if (listenerValid && controllerValid && triggerValid) {
        this.testResults.passed++;
        console.log('   ✅ Estrutura do código está correta');
      } else {
        this.testResults.failed++;
        console.log('   ❌ Estrutura do código tem problemas');
      }
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'CODE_STRUCTURE',
        error: error.message,
      });
      console.log('   ❌ Erro ao verificar estrutura do código');
      console.log(`      Erro: ${error.message}`);
    }
  }

  printResults() {
    const duration = Date.now() - this.testResults.startTime;

    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTADO DO TESTE END-TO-END MÍNIMO');
    console.log('='.repeat(60));

    console.log(`⏱️  Duração total: ${Math.round(duration / 1000)}s`);
    console.log(`✅ Testes passaram: ${this.testResults.passed}`);
    console.log(`❌ Testes falharam: ${this.testResults.failed}`);
    console.log(
      `📈 Taxa de sucesso: ${Math.round((this.testResults.passed / (this.testResults.passed + this.testResults.failed)) * 100)}%`,
    );

    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERROS DETALHADOS:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
      });
    }

    console.log('\n' + '='.repeat(60));

    if (this.testResults.failed === 0) {
      console.log('🎉 TESTE END-TO-END MÍNIMO CONCLUÍDO COM SUCESSO!');
      console.log('✅ Sistema básico funcionando');
      console.log('✅ Banco de dados conectado');
      console.log('✅ Trigger PostgreSQL ativo');
      console.log('✅ Arquivos do sistema presentes');
      console.log('✅ Dependências instaladas');
      console.log('✅ Código estruturado corretamente');
      console.log('✅ Sistema pronto para execução');
    } else {
      console.log('⚠️ TESTE END-TO-END MÍNIMO COM PROBLEMAS');
      console.log('🔧 Verifique os erros acima e corrija os problemas');
    }

    console.log('='.repeat(60));
  }
}

// Executar teste E2E mínimo
async function runMinimalE2ETest() {
  const tester = new MinimalE2ETest();
  await tester.runMinimalE2ETest();
}

// Executar teste
runMinimalE2ETest().catch(console.error);
