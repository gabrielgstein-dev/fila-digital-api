#!/usr/bin/env node

/**
 * Teste End-to-End Completo do Sistema de Tickets
 *
 * Este teste simula um fluxo real completo:
 * 1. Criação de tickets
 * 2. Mudanças de status
 * 3. Notificações em tempo real
 * 4. Busca de dados
 * 5. Estatísticas do sistema
 */

const { PrismaClient } = require('@prisma/client');
const EventSource = require('eventsource');

const prisma = new PrismaClient();

class E2ETestSuite {
  constructor() {
    this.baseUrl = process.env.API_URL || 'http://localhost:3000';
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
      startTime: Date.now(),
    };
    this.testData = {
      tenant: null,
      queue: null,
      tickets: [],
      eventSources: [],
    };
  }

  async runE2ETest() {
    console.log('🚀 TESTE END-TO-END COMPLETO - SISTEMA DE TICKETS\n');
    console.log('='.repeat(80));
    console.log('Este teste simula um fluxo real completo do sistema');
    console.log('='.repeat(80));

    try {
      await this.setupTestEnvironment();
      await this.testTicketLifecycle();
      await this.testRealtimeNotifications();
      await this.testDataRetrieval();
      await this.testSystemHealth();
      await this.cleanupTestData();

      this.printResults();
    } catch (error) {
      console.error('❌ Erro crítico durante o teste E2E:', error);
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'E2E_CRITICAL',
        error: error.message,
      });
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Configurando ambiente de teste E2E...');

    // 1. Criar ou buscar tenant
    this.testData.tenant = await prisma.tenant.findFirst({
      where: { slug: 'e2e-test-tenant' },
    });

    if (!this.testData.tenant) {
      this.testData.tenant = await prisma.tenant.create({
        data: {
          name: 'Tenant E2E Test',
          slug: 'e2e-test-tenant',
          email: 'e2e@test.com',
          isActive: true,
        },
      });
      console.log(`   ✅ Tenant criado: ${this.testData.tenant.name}`);
    } else {
      console.log(`   ✅ Tenant encontrado: ${this.testData.tenant.name}`);
    }

    // 2. Criar ou buscar fila
    this.testData.queue = await prisma.queue.findFirst({
      where: {
        tenantId: this.testData.tenant.id,
        name: 'Fila E2E Test',
      },
    });

    if (!this.testData.queue) {
      this.testData.queue = await prisma.queue.create({
        data: {
          name: 'Fila E2E Test',
          description: 'Fila para teste end-to-end',
          tenantId: this.testData.tenant.id,
          isActive: true,
          capacity: 50,
          avgServiceTime: 300,
        },
      });
      console.log(`   ✅ Fila criada: ${this.testData.queue.name}`);
    } else {
      console.log(`   ✅ Fila encontrada: ${this.testData.queue.name}`);
    }

    // 3. Limpar dados anteriores
    await prisma.ticket.deleteMany({
      where: {
        queueId: this.testData.queue.id,
        clientName: { contains: 'E2E' },
      },
    });
    console.log('   ✅ Dados de teste anteriores removidos');

    this.testResults.passed++;
    console.log('   ✅ Ambiente de teste configurado com sucesso');
  }

  async testTicketLifecycle() {
    console.log('\n📝 Testando ciclo de vida completo dos tickets...');

    try {
      // 1. Criar múltiplos tickets
      console.log('   📝 Criando tickets...');
      const ticketData = [
        {
          myCallingToken: 'E2E001',
          clientName: 'Cliente E2E 1',
          clientPhone: '11999999991',
          priority: 1,
        },
        {
          myCallingToken: 'E2E002',
          clientName: 'Cliente E2E 2',
          clientPhone: '11999999992',
          priority: 2,
        },
        {
          myCallingToken: 'E2E003',
          clientName: 'Cliente E2E 3',
          clientPhone: '11999999993',
          priority: 3,
        },
      ];

      for (const data of ticketData) {
        const ticket = await prisma.ticket.create({
          data: {
            ...data,
            queueId: this.testData.queue.id,
            status: 'WAITING',
          },
        });
        this.testData.tickets.push(ticket);
        console.log(`      ✅ Ticket criado: ${ticket.myCallingToken}`);
      }

      // 2. Simular chamada do primeiro ticket
      console.log('   📞 Simulando chamada do primeiro ticket...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'CALLED',
          calledAt: new Date(),
        },
      });
      console.log('      ✅ Ticket chamado');

      // 3. Simular atendimento
      console.log('   👨‍💼 Simulando atendimento...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'IN_SERVICE',
        },
      });
      console.log('      ✅ Ticket em atendimento');

      // 4. Simular conclusão
      console.log('   ✅ Simulando conclusão...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      console.log('      ✅ Ticket concluído');

      // 5. Atualizar dados do segundo ticket
      console.log('   📝 Atualizando dados do segundo ticket...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[1].id },
        data: {
          clientName: 'Cliente E2E Atualizado',
          clientPhone: '11888888888',
          estimatedTime: 600,
        },
      });
      console.log('      ✅ Dados atualizados');

      this.testResults.passed++;
      console.log('   ✅ Ciclo de vida dos tickets testado com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'TICKET_LIFECYCLE',
        error: error.message,
      });
      console.log('   ❌ Erro no ciclo de vida dos tickets');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testRealtimeNotifications() {
    console.log('\n📡 Testando notificações em tempo real...');

    try {
      // 1. Testar stream geral
      console.log('   📡 Testando stream geral...');
      await this.testGeneralStream();

      // 2. Testar stream específico
      console.log('   📡 Testando stream de ticket específico...');
      await this.testSpecificTicketStream();

      this.testResults.passed++;
      console.log('   ✅ Notificações em tempo real testadas com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'REALTIME_NOTIFICATIONS',
        error: error.message,
      });
      console.log('   ❌ Erro nas notificações em tempo real');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testGeneralStream() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Timeout: Stream geral não recebeu notificações'));
      }, 15000);

      const eventSource = new EventSource(
        `${this.baseUrl}/api/rt/tickets/stream?queueId=${this.testData.queue.id}`,
      );

      this.testData.eventSources.push(eventSource);

      let notificationsReceived = 0;
      const expectedNotifications = 2;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (
            data.event === 'ticket_notification' ||
            data.event === 'queue_ticket_notification'
          ) {
            notificationsReceived++;
            console.log(
              `      📢 Notificação ${notificationsReceived}: ${data.event}`,
            );
            console.log(
              `         Ticket: ${data.data.id}, Ação: ${data.data.action}`,
            );

            if (notificationsReceived >= expectedNotifications) {
              clearTimeout(timeout);
              eventSource.close();
              resolve();
            }
          }
        } catch (error) {
          console.log(`      ⚠️ Erro ao processar evento: ${error.message}`);
        }
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(
          new Error(
            `Erro no stream geral: ${error.message || 'Conexão falhou'}`,
          ),
        );
      };

      // Fazer mudanças para disparar notificações
      setTimeout(async () => {
        try {
          await prisma.ticket.update({
            where: { id: this.testData.tickets[1].id },
            data: {
              status: 'CALLED',
              calledAt: new Date(),
            },
          });

          await new Promise((resolve) => setTimeout(resolve, 1000));

          await prisma.ticket.update({
            where: { id: this.testData.tickets[2].id },
            data: {
              status: 'CALLED',
              calledAt: new Date(),
            },
          });
        } catch (error) {
          console.log(`      ⚠️ Erro ao fazer mudanças: ${error.message}`);
        }
      }, 2000);
    });
  }

  async testSpecificTicketStream() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(
          new Error('Timeout: Stream específico não recebeu notificações'),
        );
      }, 10000);

      const eventSource = new EventSource(
        `${this.baseUrl}/api/rt/tickets/${this.testData.tickets[1].id}/stream`,
      );

      this.testData.eventSources.push(eventSource);

      let notificationsReceived = 0;
      const expectedNotifications = 1;

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (data.event === 'ticket_specific_notification') {
            notificationsReceived++;
            console.log(
              `      📢 Notificação específica recebida: Ticket ${data.ticketId}`,
            );

            if (notificationsReceived >= expectedNotifications) {
              clearTimeout(timeout);
              eventSource.close();
              resolve();
            }
          }
        } catch (error) {
          console.log(
            `      ⚠️ Erro ao processar evento específico: ${error.message}`,
          );
        }
      };

      eventSource.onerror = (error) => {
        clearTimeout(timeout);
        eventSource.close();
        reject(
          new Error(
            `Erro no stream específico: ${error.message || 'Conexão falhou'}`,
          ),
        );
      };

      // Fazer mudança para disparar notificação
      setTimeout(async () => {
        try {
          await prisma.ticket.update({
            where: { id: this.testData.tickets[1].id },
            data: {
              status: 'IN_SERVICE',
            },
          });
        } catch (error) {
          console.log(
            `      ⚠️ Erro ao fazer mudança específica: ${error.message}`,
          );
        }
      }, 1000);
    });
  }

  async testDataRetrieval() {
    console.log('\n🔍 Testando recuperação de dados...');

    try {
      // 1. Buscar ticket específico
      console.log('   🔍 Testando busca de ticket específico...');
      const ticketResponse = await this.makeRequest(
        `/api/rt/tickets/${this.testData.tickets[0].id}`,
      );

      if (ticketResponse.id === this.testData.tickets[0].id) {
        console.log('      ✅ Ticket específico encontrado');
      } else {
        throw new Error('Ticket retornado não corresponde ao esperado');
      }

      // 2. Buscar tickets da fila
      console.log('   🔍 Testando busca de tickets da fila...');
      const queueResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testData.queue.id}`,
      );

      if (queueResponse.tickets && queueResponse.tickets.length > 0) {
        console.log(
          `      ✅ ${queueResponse.count} tickets encontrados na fila`,
        );
      } else {
        throw new Error('Nenhum ticket retornado para a fila');
      }

      // 3. Buscar tickets por status
      console.log('   🔍 Testando busca por status...');
      const waitingResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testData.queue.id}?status=WAITING`,
      );
      const calledResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testData.queue.id}?status=CALLED`,
      );
      const completedResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testData.queue.id}?status=COMPLETED`,
      );

      console.log(`      ✅ WAITING: ${waitingResponse.count} tickets`);
      console.log(`      ✅ CALLED: ${calledResponse.count} tickets`);
      console.log(`      ✅ COMPLETED: ${completedResponse.count} tickets`);

      this.testResults.passed++;
      console.log('   ✅ Recuperação de dados testada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'DATA_RETRIEVAL',
        error: error.message,
      });
      console.log('   ❌ Erro na recuperação de dados');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testSystemHealth() {
    console.log('\n📊 Testando saúde do sistema...');

    try {
      // 1. Testar endpoint de estatísticas
      console.log('   📊 Testando estatísticas do sistema...');
      const statsResponse = await this.makeRequest('/api/rt/tickets/stats');

      if (statsResponse.streams && statsResponse.postgres) {
        console.log('      ✅ Estatísticas do sistema obtidas');
        console.log(
          `         Streams ativos: ${statsResponse.streams.activeStreams}`,
        );
        console.log(
          `         PostgreSQL conectado: ${statsResponse.postgres.isConnected}`,
        );
        console.log(
          `         PostgreSQL escutando: ${statsResponse.postgres.isListening}`,
        );
      } else {
        throw new Error('Estrutura de estatísticas inválida');
      }

      // 2. Testar endpoint de saúde
      console.log('   ❤️ Testando endpoint de saúde...');
      const healthResponse = await this.makeRequest('/api/rt/health');

      if (healthResponse.ok) {
        console.log('      ✅ Sistema saudável');
      } else {
        throw new Error('Sistema não está saudável');
      }

      this.testResults.passed++;
      console.log('   ✅ Saúde do sistema verificada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'SYSTEM_HEALTH',
        error: error.message,
      });
      console.log('   ❌ Erro na verificação da saúde do sistema');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async makeRequest(path) {
    const url = `${this.baseUrl}${path}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      throw new Error(`Erro na requisição ${url}: ${error.message}`);
    }
  }

  async cleanupTestData() {
    console.log('\n🧹 Limpando dados de teste...');

    try {
      if (this.testData.tickets.length > 0) {
        await prisma.ticket.deleteMany({
          where: {
            id: { in: this.testData.tickets.map((t) => t.id) },
          },
        });
        console.log(
          `   ✅ ${this.testData.tickets.length} tickets de teste removidos`,
        );
      }
    } catch (error) {
      console.log(`   ⚠️ Erro ao limpar dados de teste: ${error.message}`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Limpando recursos...');

    // Fechar todas as conexões SSE
    this.testData.eventSources.forEach((eventSource) => {
      try {
        eventSource.close();
      } catch (error) {
        // Ignorar erros de fechamento
      }
    });

    // Fechar conexão Prisma
    try {
      await prisma.$disconnect();
    } catch (error) {
      console.log(`   ⚠️ Erro ao desconectar Prisma: ${error.message}`);
    }
  }

  printResults() {
    const duration = Date.now() - this.testResults.startTime;

    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADO DO TESTE END-TO-END');
    console.log('='.repeat(80));

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

    console.log('\n' + '='.repeat(80));

    if (this.testResults.failed === 0) {
      console.log('🎉 TESTE END-TO-END CONCLUÍDO COM SUCESSO!');
      console.log('✅ Sistema de tickets funcionando perfeitamente');
      console.log('✅ Cadastro de tickets funcionando');
      console.log('✅ Mudanças de status funcionando');
      console.log('✅ Sistema de tempo real funcionando');
      console.log('✅ Recuperação de dados funcionando');
      console.log('✅ Sistema saudável e operacional');
    } else {
      console.log('⚠️ TESTE END-TO-END COM PROBLEMAS');
      console.log('🔧 Verifique os erros acima e corrija os problemas');
    }

    console.log('='.repeat(80));
  }
}

// Executar teste E2E
async function runE2ETest() {
  const tester = new E2ETestSuite();
  await tester.runE2ETest();
}

// Verificar se o módulo eventsource está disponível
try {
  require('eventsource');
} catch (error) {
  console.log('📦 Instalando dependência eventsource...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install eventsource', { stdio: 'inherit' });
    console.log('✅ Dependência instalada com sucesso');
  } catch (installError) {
    console.error('❌ Erro ao instalar dependência:', installError.message);
    console.log('💡 Execute manualmente: npm install eventsource');
    process.exit(1);
  }
}

// Executar teste E2E
runE2ETest().catch(console.error);
