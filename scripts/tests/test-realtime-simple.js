#!/usr/bin/env node

/**
 * Teste Simples do Sistema de Tempo Real
 *
 * Este script testa apenas o sistema de tempo real:
 * 1. Conecta ao stream SSE
 * 2. Faz mudanças no banco
 * 3. Verifica se recebe notificações
 */

const { PrismaClient } = require('@prisma/client');
const EventSource = require('eventsource');

const prisma = new PrismaClient();

async function testRealtimeSystem() {
  console.log('📡 Teste do Sistema de Tempo Real\n');
  console.log('='.repeat(50));

  let eventSource = null;
  let testTicket = null;
  let testQueue = null;

  try {
    // 1. Configurar ambiente
    console.log('1️⃣ Configurando ambiente...');

    // Buscar fila de teste
    testQueue = await prisma.queue.findFirst({
      where: { name: 'Fila de Teste Básico' },
    });

    if (!testQueue) {
      console.log(
        '   ❌ Fila de teste não encontrada. Execute primeiro o teste básico.',
      );
      return;
    }

    console.log(`   ✅ Fila encontrada: ${testQueue.name}`);

    // 2. Conectar ao stream
    console.log('\n2️⃣ Conectando ao stream SSE...');

    const baseUrl = process.env.API_URL || 'http://localhost:3000';
    const streamUrl = `${baseUrl}/api/rt/tickets/stream?queueId=${testQueue.id}`;

    console.log(`   📡 URL do stream: ${streamUrl}`);

    eventSource = new EventSource(streamUrl);

    let notificationsReceived = 0;
    const maxWaitTime = 15000; // 15 segundos
    const startTime = Date.now();

    // 3. Configurar listeners
    console.log('   🔍 Aguardando notificações...');

    eventSource.onopen = () => {
      console.log('   ✅ Conexão SSE estabelecida');
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (
          data.event === 'ticket_notification' ||
          data.event === 'queue_ticket_notification'
        ) {
          notificationsReceived++;
          console.log(`   📢 Notificação ${notificationsReceived} recebida:`);
          console.log(`      Evento: ${data.event}`);
          console.log(`      Ticket ID: ${data.data.id}`);
          console.log(`      Ação: ${data.data.action}`);
          console.log(`      Timestamp: ${data.data.timestamp}`);

          if (notificationsReceived >= 2) {
            console.log('   ✅ Número suficiente de notificações recebidas');
            eventSource.close();
          }
        } else if (data.event === 'heartbeat') {
          console.log('   💓 Heartbeat recebido');
        } else if (data.event === 'stream_opened') {
          console.log('   🚀 Stream aberto com sucesso');
        }
      } catch (error) {
        console.log(`   ⚠️ Erro ao processar evento: ${error.message}`);
      }
    };

    eventSource.onerror = (error) => {
      console.log(`   ❌ Erro no stream: ${error.message || 'Conexão falhou'}`);
      eventSource.close();
    };

    // 4. Aguardar conexão e fazer mudanças
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Aguardar 2s para conectar

    console.log('\n3️⃣ Fazendo mudanças no banco...');

    // Criar ticket de teste
    testTicket = await prisma.ticket.create({
      data: {
        myCallingToken: 'REALTIME001',
        clientName: 'Cliente Tempo Real',
        clientPhone: '11988888888',
        queueId: testQueue.id,
        status: 'WAITING',
        priority: 1,
      },
    });
    console.log(`   ✅ Ticket criado: ${testTicket.myCallingToken}`);

    // Aguardar um pouco para a notificação
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Alterar status do ticket
    await prisma.ticket.update({
      where: { id: testTicket.id },
      data: {
        status: 'CALLED',
        calledAt: new Date(),
      },
    });
    console.log('   ✅ Status alterado para CALLED');

    // 5. Aguardar notificações
    console.log('\n4️⃣ Aguardando notificações...');

    const waitForNotifications = () => {
      return new Promise((resolve, reject) => {
        const checkInterval = setInterval(() => {
          const elapsed = Date.now() - startTime;

          if (notificationsReceived >= 2) {
            clearInterval(checkInterval);
            resolve();
          } else if (elapsed > maxWaitTime) {
            clearInterval(checkInterval);
            reject(
              new Error(
                `Timeout: Apenas ${notificationsReceived} notificações recebidas em ${maxWaitTime}ms`,
              ),
            );
          }
        }, 100);
      });
    };

    try {
      await waitForNotifications();
      console.log('   ✅ Notificações recebidas com sucesso');
    } catch (error) {
      console.log(`   ⚠️ ${error.message}`);
    }

    // 6. Testar endpoint de ticket específico
    console.log('\n5️⃣ Testando endpoint de ticket específico...');

    try {
      const response = await fetch(
        `${baseUrl}/api/rt/tickets/${testTicket.id}`,
      );
      if (response.ok) {
        const ticketData = await response.json();
        console.log('   ✅ Endpoint de ticket específico funcionando');
        console.log(`      Ticket: ${ticketData.myCallingToken}`);
        console.log(`      Status: ${ticketData.status}`);
      } else {
        console.log('   ⚠️ Endpoint de ticket específico não disponível');
      }
    } catch (error) {
      console.log('   ⚠️ Erro ao testar endpoint de ticket específico');
    }

    // 7. Resultado final
    console.log('\n' + '='.repeat(50));
    if (notificationsReceived > 0) {
      console.log('🎉 SISTEMA DE TEMPO REAL FUNCIONANDO!');
      console.log(`✅ ${notificationsReceived} notificações recebidas`);
      console.log('✅ PostgreSQL NOTIFY ativo');
      console.log('✅ SSE funcionando');
    } else {
      console.log('⚠️ SISTEMA DE TEMPO REAL COM PROBLEMAS');
      console.log('❌ Nenhuma notificação recebida');
      console.log('🔧 Verifique se o servidor está rodando');
      console.log('🔧 Verifique se o trigger PostgreSQL está ativo');
    }
    console.log('='.repeat(50));
  } catch (error) {
    console.error('\n❌ ERRO DURANTE O TESTE:', error);
  } finally {
    // Limpeza
    if (eventSource) {
      eventSource.close();
    }

    if (testTicket) {
      try {
        await prisma.ticket.delete({
          where: { id: testTicket.id },
        });
        console.log('\n🧹 Ticket de teste removido');
      } catch (error) {
        console.log('\n⚠️ Erro ao remover ticket de teste');
      }
    }

    await prisma.$disconnect();
  }
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

// Executar teste
testRealtimeSystem().catch(console.error);
