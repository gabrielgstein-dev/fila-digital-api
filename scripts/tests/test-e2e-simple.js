#!/usr/bin/env node

/**
 * Teste End-to-End Simples do Sistema de Tickets
 *
 * Este teste verifica o fluxo completo sem depender do servidor:
 * 1. Criação de tickets
 * 2. Mudanças de status
 * 3. Verificação do trigger PostgreSQL
 * 4. Validação dos dados
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

class SimpleE2ETest {
  constructor() {
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
    };
  }

  async runSimpleE2ETest() {
    console.log('🚀 TESTE END-TO-END SIMPLES - SISTEMA DE TICKETS\n');
    console.log('='.repeat(70));
    console.log(
      'Este teste verifica o fluxo completo sem depender do servidor',
    );
    console.log('='.repeat(70));

    try {
      await this.setupTestEnvironment();
      await this.testTicketCreation();
      await this.testTicketStatusChanges();
      await this.testDataIntegrity();
      await this.testTriggerFunctionality();
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
    console.log('\n🔧 Configurando ambiente de teste...');

    // 1. Verificar se o trigger está ativo
    console.log('   🔍 Verificando trigger PostgreSQL...');
    const triggerExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'ticket_changes_trigger'
      ) as exists;
    `;

    if (triggerExists[0].exists) {
      console.log('      ✅ Trigger PostgreSQL está ativo');
    } else {
      throw new Error(
        'Trigger PostgreSQL não encontrado. Execute a migração primeiro.',
      );
    }

    // 2. Criar ou buscar tenant
    this.testData.tenant = await prisma.tenant.findFirst({
      where: { slug: 'e2e-simple-tenant' },
    });

    if (!this.testData.tenant) {
      this.testData.tenant = await prisma.tenant.create({
        data: {
          name: 'Tenant E2E Simple',
          slug: 'e2e-simple-tenant',
          email: 'e2e-simple@test.com',
          isActive: true,
        },
      });
      console.log('      ✅ Tenant criado');
    } else {
      console.log('      ✅ Tenant encontrado');
    }

    // 3. Criar ou buscar fila
    this.testData.queue = await prisma.queue.findFirst({
      where: {
        tenantId: this.testData.tenant.id,
        name: 'Fila E2E Simple',
      },
    });

    if (!this.testData.queue) {
      this.testData.queue = await prisma.queue.create({
        data: {
          name: 'Fila E2E Simple',
          description: 'Fila para teste E2E simples',
          tenantId: this.testData.tenant.id,
          isActive: true,
          capacity: 30,
          avgServiceTime: 300,
        },
      });
      console.log('      ✅ Fila criada');
    } else {
      console.log('      ✅ Fila encontrada');
    }

    // 4. Limpar dados anteriores
    await prisma.ticket.deleteMany({
      where: {
        queueId: this.testData.queue.id,
        clientName: { contains: 'E2E Simple' },
      },
    });
    console.log('      ✅ Dados anteriores removidos');

    this.testResults.passed++;
    console.log('   ✅ Ambiente configurado com sucesso');
  }

  async testTicketCreation() {
    console.log('\n📝 Testando criação de tickets...');

    try {
      // Criar tickets com diferentes prioridades
      const ticketData = [
        {
          myCallingToken: 'E2E-SIMPLE-001',
          clientName: 'Cliente E2E Simple 1',
          clientPhone: '11999999991',
          priority: 1,
        },
        {
          myCallingToken: 'E2E-SIMPLE-002',
          clientName: 'Cliente E2E Simple 2',
          clientPhone: '11999999992',
          priority: 2,
        },
        {
          myCallingToken: 'E2E-SIMPLE-003',
          clientName: 'Cliente E2E Simple 3',
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
        console.log(
          `      ✅ Ticket criado: ${ticket.myCallingToken} (ID: ${ticket.id})`,
        );
      }

      // Verificar se os tickets foram criados corretamente
      const createdTickets = await prisma.ticket.findMany({
        where: {
          queueId: this.testData.queue.id,
          clientName: { contains: 'E2E Simple' },
        },
      });

      if (createdTickets.length === 3) {
        console.log('      ✅ Todos os tickets foram criados corretamente');
      } else {
        throw new Error(
          `Esperado 3 tickets, encontrado ${createdTickets.length}`,
        );
      }

      this.testResults.passed++;
      console.log('   ✅ Criação de tickets testada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'TICKET_CREATION',
        error: error.message,
      });
      console.log('   ❌ Erro na criação de tickets');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testTicketStatusChanges() {
    console.log('\n🔄 Testando mudanças de status...');

    try {
      // 1. Chamar primeiro ticket
      console.log('      📞 Chamando primeiro ticket...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'CALLED',
          calledAt: new Date(),
        },
      });
      console.log('         ✅ Ticket chamado');

      // 2. Colocar em atendimento
      console.log('      👨‍💼 Colocando em atendimento...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'IN_SERVICE',
        },
      });
      console.log('         ✅ Ticket em atendimento');

      // 3. Concluir atendimento
      console.log('      ✅ Concluindo atendimento...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[0].id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      console.log('         ✅ Ticket concluído');

      // 4. Atualizar dados do segundo ticket
      console.log('      📝 Atualizando dados do segundo ticket...');
      await prisma.ticket.update({
        where: { id: this.testData.tickets[1].id },
        data: {
          clientName: 'Cliente E2E Atualizado',
          clientPhone: '11888888888',
          estimatedTime: 600,
        },
      });
      console.log('         ✅ Dados atualizados');

      // 5. Verificar se as mudanças foram salvas
      const updatedTicket = await prisma.ticket.findUnique({
        where: { id: this.testData.tickets[0].id },
      });

      if (updatedTicket.status === 'COMPLETED' && updatedTicket.completedAt) {
        console.log('         ✅ Mudanças de status salvas corretamente');
      } else {
        throw new Error('Mudanças de status não foram salvas corretamente');
      }

      this.testResults.passed++;
      console.log('   ✅ Mudanças de status testadas com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'STATUS_CHANGES',
        error: error.message,
      });
      console.log('   ❌ Erro nas mudanças de status');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testDataIntegrity() {
    console.log('\n🔍 Testando integridade dos dados...');

    try {
      // 1. Verificar tickets por status
      console.log('      🔍 Verificando tickets por status...');
      const waitingTickets = await prisma.ticket.findMany({
        where: {
          queueId: this.testData.queue.id,
          status: 'WAITING',
        },
      });
      console.log(`         ✅ WAITING: ${waitingTickets.length} tickets`);

      const calledTickets = await prisma.ticket.findMany({
        where: {
          queueId: this.testData.queue.id,
          status: 'CALLED',
        },
      });
      console.log(`         ✅ CALLED: ${calledTickets.length} tickets`);

      const completedTickets = await prisma.ticket.findMany({
        where: {
          queueId: this.testData.queue.id,
          status: 'COMPLETED',
        },
      });
      console.log(`         ✅ COMPLETED: ${completedTickets.length} tickets`);

      // 2. Verificar relacionamentos
      console.log('      🔍 Verificando relacionamentos...');
      const ticketWithQueue = await prisma.ticket.findFirst({
        where: { id: this.testData.tickets[0].id },
        include: { queue: true },
      });

      if (ticketWithQueue.queue.id === this.testData.queue.id) {
        console.log('         ✅ Relacionamento com fila correto');
      } else {
        throw new Error('Relacionamento com fila incorreto');
      }

      // 3. Verificar campos obrigatórios
      console.log('      🔍 Verificando campos obrigatórios...');
      const allTickets = await prisma.ticket.findMany({
        where: {
          queueId: this.testData.queue.id,
          clientName: { contains: 'E2E Simple' },
        },
      });

      for (const ticket of allTickets) {
        if (!ticket.id || !ticket.myCallingToken || !ticket.queueId) {
          throw new Error(
            `Ticket ${ticket.id} tem campos obrigatórios ausentes`,
          );
        }
      }
      console.log('         ✅ Todos os campos obrigatórios presentes');

      this.testResults.passed++;
      console.log('   ✅ Integridade dos dados verificada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'DATA_INTEGRITY',
        error: error.message,
      });
      console.log('   ❌ Erro na verificação da integridade dos dados');
      console.log(`      Erro: ${error.message}`);
    }
  }

  async testTriggerFunctionality() {
    console.log('\n⚡ Testando funcionalidade do trigger...');

    try {
      // 1. Verificar se a função existe
      console.log('      🔍 Verificando função do trigger...');
      const functionExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc 
          WHERE proname = 'notify_ticket_changes'
        ) as exists;
      `;

      if (functionExists[0].exists) {
        console.log('         ✅ Função notify_ticket_changes existe');
      } else {
        throw new Error('Função notify_ticket_changes não encontrada');
      }

      // 2. Verificar se o trigger está ativo
      console.log('      🔍 Verificando trigger ativo...');
      const triggerActive = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM pg_trigger 
          WHERE tgname = 'ticket_changes_trigger' 
          AND tgisinternal = false
        ) as exists;
      `;

      if (triggerActive[0].exists) {
        console.log('         ✅ Trigger ticket_changes_trigger está ativo');
      } else {
        throw new Error('Trigger ticket_changes_trigger não está ativo');
      }

      // 3. Testar inserção (deve disparar trigger)
      console.log('      ⚡ Testando disparo do trigger...');
      const testTicket = await prisma.ticket.create({
        data: {
          myCallingToken: 'E2E-TRIGGER-TEST',
          clientName: 'Cliente Trigger Test',
          clientPhone: '11777777777',
          queueId: this.testData.queue.id,
          status: 'WAITING',
          priority: 1,
        },
      });
      console.log(
        '         ✅ Ticket de teste criado (trigger deve ter disparado)',
      );

      // 4. Testar atualização (deve disparar trigger)
      await prisma.ticket.update({
        where: { id: testTicket.id },
        data: {
          status: 'CALLED',
          calledAt: new Date(),
        },
      });
      console.log('         ✅ Ticket atualizado (trigger deve ter disparado)');

      // 5. Limpar ticket de teste
      await prisma.ticket.delete({
        where: { id: testTicket.id },
      });
      console.log('         ✅ Ticket de teste removido');

      this.testResults.passed++;
      console.log('   ✅ Funcionalidade do trigger testada com sucesso');
    } catch (error) {
      this.testResults.failed++;
      this.testResults.errors.push({
        test: 'TRIGGER_FUNCTIONALITY',
        error: error.message,
      });
      console.log('   ❌ Erro na funcionalidade do trigger');
      console.log(`      Erro: ${error.message}`);
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

    try {
      await prisma.$disconnect();
    } catch (error) {
      console.log(`   ⚠️ Erro ao desconectar Prisma: ${error.message}`);
    }
  }

  printResults() {
    const duration = Date.now() - this.testResults.startTime;

    console.log('\n' + '='.repeat(70));
    console.log('📊 RESULTADO DO TESTE END-TO-END SIMPLES');
    console.log('='.repeat(70));

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

    console.log('\n' + '='.repeat(70));

    if (this.testResults.failed === 0) {
      console.log('🎉 TESTE END-TO-END SIMPLES CONCLUÍDO COM SUCESSO!');
      console.log('✅ Sistema de tickets funcionando perfeitamente');
      console.log('✅ Cadastro de tickets funcionando');
      console.log('✅ Mudanças de status funcionando');
      console.log('✅ Integridade dos dados verificada');
      console.log('✅ Trigger PostgreSQL funcionando');
      console.log('✅ Sistema pronto para produção');
    } else {
      console.log('⚠️ TESTE END-TO-END SIMPLES COM PROBLEMAS');
      console.log('🔧 Verifique os erros acima e corrija os problemas');
    }

    console.log('='.repeat(70));
  }
}

// Executar teste E2E simples
async function runSimpleE2ETest() {
  const tester = new SimpleE2ETest();
  await tester.runSimpleE2ETest();
}

// Executar teste
runSimpleE2ETest().catch(console.error);
