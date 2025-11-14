#!/usr/bin/env node

/**
 * Teste Completo do Sistema de Tickets em Tempo Real
 *
 * Este script testa:
 * 1. Cadastro de tickets
 * 2. Mudanças de status
 * 3. Sistema de tempo real (PostgreSQL NOTIFY + SSE)
 * 4. Endpoints de busca
 * 5. Estatísticas do sistema
 */

const { PrismaClient } = require('@prisma/client');
const EventSource = require('eventsource');

const prisma = new PrismaClient();

// Configurações de teste
const TEST_CONFIG = {
  baseUrl: process.env.API_URL || 'http://localhost:3000',
  timeout: 10000,
  retries: 3,
};

class TicketRealtimeTester {
  constructor() {
    this.testResults = {
      passed: 0,
      failed: 0,
      errors: [],
    };
    this.testQueue = null;
    this.testTickets = [];
    this.eventSources = [];
  }

  async runAllTests() {
    console.log(
      '🧪 Iniciando Teste Completo do Sistema de Tickets em Tempo Real\n',
    );
    console.log('='.repeat(80));

    try {
      await this.setupTestEnvironment();

      await this.testTicketCreation();
      await this.testTicketStatusChanges();
      await this.testRealtimeNotifications();
      await this.testEndpoints();
      await this.testSystemStats();

      await this.cleanupTestData();

      this.printResults();
    } catch (error) {
      console.error('❌ Erro crítico durante os testes:', error);
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'SETUP', error: error.message });
    } finally {
      await this.cleanup();
    }
  }

  async setupTestEnvironment() {
    console.log('\n🔧 Configurando ambiente de teste...');

    // Buscar ou criar tenant de teste
    let tenant = await prisma.tenant.findFirst({
      where: { slug: 'test-tenant' },
    });

    if (!tenant) {
      tenant = await prisma.tenant.create({
        data: {
          name: 'Tenant de Teste',
          slug: 'test-tenant',
          email: 'test@example.com',
          isActive: true,
        },
      });
      console.log(`   ✅ Tenant criado: ${tenant.name}`);
    } else {
      console.log(`   ✅ Tenant encontrado: ${tenant.name}`);
    }

    // Buscar ou criar fila de teste
    this.testQueue = await prisma.queue.findFirst({
      where: {
        tenantId: tenant.id,
        name: 'Fila de Teste Realtime',
      },
    });

    if (!this.testQueue) {
      this.testQueue = await prisma.queue.create({
        data: {
          name: 'Fila de Teste Realtime',
          description: 'Fila para testes do sistema de tempo real',
          tenantId: tenant.id,
          isActive: true,
          capacity: 100,
          avgServiceTime: 300,
        },
      });
      console.log(`   ✅ Fila criada: ${this.testQueue.name}`);
    } else {
      console.log(`   ✅ Fila encontrada: ${this.testQueue.name}`);
    }

    // Limpar tickets de teste anteriores
    await prisma.ticket.deleteMany({
      where: {
        queueId: this.testQueue.id,
        clientName: { contains: 'Teste' },
      },
    });
    console.log('   ✅ Tickets de teste anteriores removidos');
  }

  async testTicketCreation() {
    console.log('\n📝 Testando criação de tickets...');

    try {
      // Criar 3 tickets de teste
      const ticketData = [
        {
          myCallingToken: 'T001',
          clientName: 'Cliente Teste 1',
          clientPhone: '11999999991',
          priority: 1,
        },
        {
          myCallingToken: 'T002',
          clientName: 'Cliente Teste 2',
          clientPhone: '11999999992',
          priority: 2,
        },
        {
          myCallingToken: 'T003',
          clientName: 'Cliente Teste 3',
          clientPhone: '11999999993',
          priority: 3,
        },
      ];

      for (const data of ticketData) {
        const ticket = await prisma.ticket.create({
          data: {
            ...data,
            queueId: this.testQueue.id,
            status: 'WAITING',
          },
        });
        this.testTickets.push(ticket);
        console.log(
          `   ✅ Ticket criado: ${ticket.myCallingToken} (ID: ${ticket.id})`,
        );
      }

      this.testResults.passed++;
      console.log('   ✅ Teste de criação de tickets: PASSOU');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'TICKET_CREATION',
        error: error.message,
      });
      console.log('   ❌ Teste de criação de tickets: FALHOU');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testTicketStatusChanges() {
    console.log('\n🔄 Testando mudanças de status...');

    try {
      // Testar mudança para CALLED
      console.log('   🔄 Mudando status para CALLED...');
      await prisma.ticket.update({
        where: { id: this.testTickets[0].id },
        data: {
          status: 'CALLED',
          calledAt: new Date(),
        },
      });
      console.log('   ✅ Status alterado para CALLED');

      // Testar mudança para IN_SERVICE
      console.log('   🔄 Mudando status para IN_SERVICE...');
      await prisma.ticket.update({
        where: { id: this.testTickets[0].id },
        data: { status: 'IN_SERVICE' },
      });
      console.log('   ✅ Status alterado para IN_SERVICE');

      // Testar mudança para COMPLETED
      console.log('   🔄 Mudando status para COMPLETED...');
      await prisma.ticket.update({
        where: { id: this.testTickets[0].id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      console.log('   ✅ Status alterado para COMPLETED');

      // Testar atualização de dados do cliente
      console.log('   🔄 Atualizando dados do cliente...');
      await prisma.ticket.update({
        where: { id: this.testTickets[1].id },
        data: {
          clientName: 'Cliente Atualizado',
          clientPhone: '11888888888',
        },
      });
      console.log('   ✅ Dados do cliente atualizados');

      this.testResults.passed++;
      console.log('   ✅ Teste de mudanças de status: PASSOU');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'STATUS_CHANGES',
        error: error.message,
      });
      console.log('   ❌ Teste de mudanças de status: FALHOU');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testRealtimeNotifications() {
    console.log('\n📡 Testando notificações em tempo real...');

    try {
      // Testar stream geral de tickets
      console.log('   📡 Testando stream geral...');
      await this.testGeneralStream();

      // Testar stream de ticket específico
      console.log('   📡 Testando stream de ticket específico...');
      await this.testSpecificTicketStream();

      this.testResults.passed++;
      console.log('   ✅ Teste de notificações em tempo real: PASSOU');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'REALTIME_NOTIFICATIONS',
        error: error.message,
      });
      console.log('   ❌ Teste de notificações em tempo real: FALHOU');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testGeneralStream() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(new Error('Timeout: Stream geral não recebeu notificações'));
      }, TEST_CONFIG.timeout);

      const eventSource = new EventSource(
        `${TEST_CONFIG.baseUrl}/api/rt/tickets/stream?queueId=${this.testQueue.id}`,
      );

      this.eventSources.push(eventSource);

      let notificationsReceived = 0;
      const expectedNotifications = 2; // Pelo menos 2 mudanças

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          if (
            data.event === 'ticket_notification' ||
            data.event === 'queue_ticket_notification'
          ) {
            notificationsReceived++;
            console.log(
              `      📢 Notificação recebida: ${data.event} - Ticket ${data.data.id}`,
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

      // Fazer uma mudança para disparar notificação
      setTimeout(async () => {
        try {
          await prisma.ticket.update({
            where: { id: this.testTickets[1].id },
            data: {
              status: 'CALLED',
              calledAt: new Date(),
            },
          });
        } catch (error) {
          console.log(
            `      ⚠️ Erro ao fazer mudança de teste: ${error.message}`,
          );
        }
      }, 1000);
    });
  }

  async testSpecificTicketStream() {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        eventSource.close();
        reject(
          new Error('Timeout: Stream específico não recebeu notificações'),
        );
      }, TEST_CONFIG.timeout);

      const eventSource = new EventSource(
        `${TEST_CONFIG.baseUrl}/api/rt/tickets/${this.testTickets[2].id}/stream`,
      );

      this.eventSources.push(eventSource);

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

      // Fazer uma mudança para disparar notificação
      setTimeout(async () => {
        try {
          await prisma.ticket.update({
            where: { id: this.testTickets[2].id },
            data: {
              status: 'CALLED',
              calledAt: new Date(),
            },
          });
        } catch (error) {
          console.log(
            `      ⚠️ Erro ao fazer mudança de teste específica: ${error.message}`,
          );
        }
      }, 1000);
    });
  }

  async testEndpoints() {
    console.log('\n🌐 Testando endpoints...');

    try {
      // Testar busca de ticket específico
      console.log('   🔍 Testando busca de ticket específico...');
      const ticketResponse = await this.makeRequest(
        `/api/rt/tickets/${this.testTickets[0].id}`,
      );
      if (ticketResponse.id === this.testTickets[0].id) {
        console.log('   ✅ Busca de ticket específico: PASSOU');
      } else {
        throw new Error('Ticket retornado não corresponde ao esperado');
      }

      // Testar busca de tickets da fila
      console.log('   🔍 Testando busca de tickets da fila...');
      const queueResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testQueue.id}`,
      );
      if (queueResponse.tickets && queueResponse.tickets.length > 0) {
        console.log(
          `   ✅ Busca de tickets da fila: PASSOU (${queueResponse.count} tickets)`,
        );
      } else {
        throw new Error('Nenhum ticket retornado para a fila');
      }

      // Testar busca com filtro de status
      console.log('   🔍 Testando busca com filtro de status...');
      const waitingResponse = await this.makeRequest(
        `/api/rt/tickets/queue/${this.testQueue.id}?status=WAITING`,
      );
      if (waitingResponse.tickets) {
        console.log(
          `   ✅ Busca com filtro de status: PASSOU (${waitingResponse.count} tickets em espera)`,
        );
      } else {
        throw new Error('Filtro de status não funcionou');
      }

      this.testResults.passed++;
      console.log('   ✅ Teste de endpoints: PASSOU');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({ test: 'ENDPOINTS', error: error.message });
      console.log('   ❌ Teste de endpoints: FALHOU');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testSystemStats() {
    console.log('\n📊 Testando estatísticas do sistema...');

    try {
      const statsResponse = await this.makeRequest('/api/rt/tickets/stats');

      if (statsResponse.streams && statsResponse.postgres) {
        console.log('   ✅ Estatísticas do sistema: PASSOU');
        console.log(
          `      Streams ativos: ${statsResponse.streams.activeStreams}`,
        );
        console.log(
          `      PostgreSQL conectado: ${statsResponse.postgres.isConnected}`,
        );
        console.log(
          `      PostgreSQL escutando: ${statsResponse.postgres.isListening}`,
        );
      } else {
        throw new Error('Estrutura de estatísticas inválida');
      }

      this.testResults.passed++;
      console.log('   ✅ Teste de estatísticas: PASSOU');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'SYSTEM_STATS',
        error: error.message,
      });
      console.log('   ❌ Teste de estatísticas: FALHOU');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async makeRequest(path) {
    const url = `${TEST_CONFIG.baseUrl}${path}`;

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
      if (this.testTickets.length > 0) {
        await prisma.ticket.deleteMany({
          where: {
            id: { in: this.testTickets.map((t) => t.id) },
          },
        });
        console.log(
          `   ✅ ${this.testTickets.length} tickets de teste removidos`,
        );
      }
    } catch (error) {
      console.log(`   ⚠️ Erro ao limpar dados de teste: ${error.message}`);
    }
  }

  async cleanup() {
    console.log('\n🧹 Limpando recursos...');

    // Fechar todas as conexões SSE
    this.eventSources.forEach((eventSource) => {
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
    console.log('\n' + '='.repeat(80));
    console.log('📊 RESULTADOS DOS TESTES');
    console.log('='.repeat(80));

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
      console.log(
        '🎉 TODOS OS TESTES PASSARAM! Sistema funcionando perfeitamente.',
      );
    } else {
      console.log('⚠️ ALGUNS TESTES FALHARAM. Verifique os erros acima.');
    }

    console.log('='.repeat(80));
  }
}

// Executar testes
async function runTests() {
  const tester = new TicketRealtimeTester();
  await tester.runAllTests();
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

// Executar testes
runTests().catch(console.error);
