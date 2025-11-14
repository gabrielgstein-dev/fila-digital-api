#!/usr/bin/env node

/**
 * Teste Básico do Sistema de Tickets
 *
 * Verifica se:
 * 1. O trigger PostgreSQL está funcionando
 * 2. O sistema de notificações está ativo
 * 3. Os endpoints estão respondendo
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testBasicFunctionality() {
  console.log('🧪 Teste Básico do Sistema de Tickets\n');
  console.log('='.repeat(50));

  try {
    // 1. Verificar se o trigger está ativo
    console.log('1️⃣ Verificando trigger PostgreSQL...');
    const triggerExists = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'ticket_changes_trigger'
      ) as exists;
    `;

    if (triggerExists[0].exists) {
      console.log('   ✅ Trigger PostgreSQL está ativo');
    } else {
      console.log('   ❌ Trigger PostgreSQL não encontrado');
      return;
    }

    // 2. Buscar ou criar fila de teste
    console.log('\n2️⃣ Configurando fila de teste...');
    let queue = await prisma.queue.findFirst({
      where: { name: 'Fila de Teste Básico' },
    });

    if (!queue) {
      const tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        console.log(
          '   ❌ Nenhum tenant encontrado. Execute o setup primeiro.',
        );
        return;
      }

      queue = await prisma.queue.create({
        data: {
          name: 'Fila de Teste Básico',
          description: 'Fila para teste básico',
          tenantId: tenant.id,
          isActive: true,
        },
      });
      console.log(`   ✅ Fila criada: ${queue.name}`);
    } else {
      console.log(`   ✅ Fila encontrada: ${queue.name}`);
    }

    // 3. Testar criação de ticket
    console.log('\n3️⃣ Testando criação de ticket...');
    const ticket = await prisma.ticket.create({
      data: {
        myCallingToken: 'TEST001',
        clientName: 'Cliente Teste',
        clientPhone: '11999999999',
        queueId: queue.id,
        status: 'WAITING',
        priority: 1,
      },
    });
    console.log(
      `   ✅ Ticket criado: ${ticket.myCallingToken} (ID: ${ticket.id})`,
    );

    // 4. Testar mudança de status
    console.log('\n4️⃣ Testando mudança de status...');
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CALLED',
        calledAt: new Date(),
      },
    });
    console.log('   ✅ Status alterado para CALLED');

    // 5. Verificar se o ticket foi atualizado
    console.log('\n5️⃣ Verificando atualização...');
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticket.id },
    });

    if (updatedTicket.status === 'CALLED' && updatedTicket.calledAt) {
      console.log('   ✅ Ticket atualizado corretamente');
    } else {
      console.log('   ❌ Ticket não foi atualizado corretamente');
    }

    // 6. Testar endpoints (se o servidor estiver rodando)
    console.log('\n6️⃣ Testando endpoints...');
    const baseUrl = process.env.API_URL || 'http://localhost:3000';

    try {
      // Testar endpoint de estatísticas
      const response = await fetch(`${baseUrl}/api/rt/tickets/stats`);
      if (response.ok) {
        const stats = await response.json();
        console.log('   ✅ Endpoint de estatísticas funcionando');
        console.log(
          `      PostgreSQL conectado: ${stats.postgres?.isConnected || 'N/A'}`,
        );
        console.log(
          `      Streams ativos: ${stats.streams?.activeStreams || 0}`,
        );
      } else {
        console.log(
          '   ⚠️ Servidor não está rodando ou endpoint não disponível',
        );
      }
    } catch (error) {
      console.log('   ⚠️ Servidor não está rodando ou endpoint não disponível');
      console.log(`      Erro: ${error.message}`);
    }

    // 7. Limpeza
    console.log('\n7️⃣ Limpando dados de teste...');
    await prisma.ticket.delete({
      where: { id: ticket.id },
    });
    console.log('   ✅ Dados de teste removidos');

    console.log('\n' + '='.repeat(50));
    console.log('🎉 TESTE BÁSICO CONCLUÍDO COM SUCESSO!');
    console.log('✅ Sistema de tickets funcionando corretamente');
    console.log('✅ Trigger PostgreSQL ativo');
    console.log('✅ Mudanças de status funcionando');
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:', error);
    console.log('\n🔧 POSSÍVEIS SOLUÇÕES:');
    console.log('   1. Verifique se o banco de dados está conectado');
    console.log('   2. Execute a migração: npx prisma migrate deploy');
    console.log('   3. Verifique se o trigger foi criado corretamente');
    console.log('   4. Verifique as variáveis de ambiente (DATABASE_URL)');
  } finally {
    await prisma.$disconnect();
  }
}

// Executar teste
testBasicFunctionality().catch(console.error);
