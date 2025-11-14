#!/usr/bin/env node

/**
 * Script de teste para o sistema de tickets em tempo real otimizado
 * Demonstra o funcionamento do PostgreSQL LISTEN/NOTIFY + SSE
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRealtimeSystem() {
  console.log('🧪 Iniciando teste do sistema de tempo real otimizado...\n');

  try {
    // 1. Buscar uma fila existente
    console.log('1️⃣ Buscando fila existente...');
    const queue = await prisma.queue.findFirst({
      where: { isActive: true },
      select: { id: true, name: true },
    });

    if (!queue) {
      console.log(
        '❌ Nenhuma fila ativa encontrada. Criando uma fila de teste...',
      );

      const tenant = await prisma.tenant.findFirst();
      if (!tenant) {
        console.log(
          '❌ Nenhum tenant encontrado. Execute primeiro o script de setup.',
        );
        return;
      }

      const newQueue = await prisma.queue.create({
        data: {
          name: 'Fila de Teste',
          description: 'Fila para testes do sistema de tempo real',
          tenantId: tenant.id,
          isActive: true,
        },
      });

      console.log(`✅ Fila criada: ${newQueue.name} (ID: ${newQueue.id})`);
      queue.id = newQueue.id;
      queue.name = newQueue.name;
    } else {
      console.log(`✅ Fila encontrada: ${queue.name} (ID: ${queue.id})`);
    }

    // 2. Criar alguns tickets de teste
    console.log('\n2️⃣ Criando tickets de teste...');

    const tickets = [];
    for (let i = 1; i <= 3; i++) {
      const ticket = await prisma.ticket.create({
        data: {
          myCallingToken: `T${String(i).padStart(3, '0')}`,
          status: 'WAITING',
          clientName: `Cliente Teste ${i}`,
          clientPhone: `1199999999${i}`,
          queueId: queue.id,
          priority: i,
        },
      });
      tickets.push(ticket);
      console.log(
        `   ✅ Ticket criado: ${ticket.myCallingToken} (ID: ${ticket.id})`,
      );
    }

    // 3. Demonstrar mudanças que disparam NOTIFY
    console.log('\n3️⃣ Testando mudanças que disparam notificações...');

    // Atualizar status do primeiro ticket
    console.log('   🔄 Atualizando status do primeiro ticket para CALLED...');
    await prisma.ticket.update({
      where: { id: tickets[0].id },
      data: {
        status: 'CALLED',
        calledAt: new Date(),
      },
    });
    console.log('   ✅ Status atualizado - NOTIFY deve ter sido disparado');

    // Atualizar dados do segundo ticket
    console.log('   🔄 Atualizando dados do segundo ticket...');
    await prisma.ticket.update({
      where: { id: tickets[1].id },
      data: {
        clientName: 'Cliente Atualizado',
        clientPhone: '11888888888',
      },
    });
    console.log('   ✅ Dados atualizados - NOTIFY deve ter sido disparado');

    // Completar o terceiro ticket
    console.log('   🔄 Completando o terceiro ticket...');
    await prisma.ticket.update({
      where: { id: tickets[2].id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });
    console.log('   ✅ Ticket completado - NOTIFY deve ter sido disparado');

    // 4. Mostrar endpoints para teste
    console.log('\n4️⃣ Endpoints para teste manual:');
    console.log('   📡 Stream geral de tickets:');
    console.log(`      GET /api/rt/tickets/stream?queueId=${queue.id}`);
    console.log('   📡 Stream de ticket específico:');
    console.log(`      GET /api/rt/tickets/${tickets[0].id}/stream`);
    console.log('   📊 Buscar ticket específico:');
    console.log(`      GET /api/rt/tickets/${tickets[0].id}`);
    console.log('   📋 Buscar tickets da fila:');
    console.log(`      GET /api/rt/tickets/queue/${queue.id}`);
    console.log('   📈 Estatísticas do sistema:');
    console.log('      GET /api/rt/tickets/stats');

    // 5. Instruções para teste com curl
    console.log('\n5️⃣ Teste com curl:');
    console.log(
      '   # Testar stream de tickets (substitua localhost:3000 pela sua URL)',
    );
    console.log(
      `   curl -N "http://localhost:3000/api/rt/tickets/stream?queueId=${queue.id}"`,
    );
    console.log('   ');
    console.log('   # Testar busca de ticket específico');
    console.log(
      `   curl "http://localhost:3000/api/rt/tickets/${tickets[0].id}"`,
    );
    console.log('   ');
    console.log('   # Testar estatísticas');
    console.log('   curl "http://localhost:3000/api/rt/tickets/stats"');

    // 6. Instruções para teste no browser
    console.log('\n6️⃣ Teste no browser:');
    console.log('   Abra o console do navegador e execute:');
    console.log('   ');
    console.log('   ```javascript');
    console.log('   // Testar stream de tickets');
    console.log(
      `   const eventSource = new EventSource("/api/rt/tickets/stream?queueId=${queue.id}");`,
    );
    console.log('   ');
    console.log('   eventSource.onmessage = function(event) {');
    console.log('     const data = JSON.parse(event.data);');
    console.log('     console.log("Evento recebido:", data);');
    console.log('   };');
    console.log('   ');
    console.log('   eventSource.onerror = function(event) {');
    console.log('     console.error("Erro no stream:", event);');
    console.log('   };');
    console.log('   ```');

    // 7. Limpeza (opcional)
    console.log('\n7️⃣ Limpeza:');
    console.log('   Para limpar os tickets de teste, execute:');
    console.log('   ```sql');
    console.log(
      "   DELETE FROM tickets WHERE myCallingToken LIKE 'T%' AND clientName LIKE 'Cliente%Teste%';",
    );
    console.log('   ```');

    console.log(
      '\n✅ Teste concluído! O sistema de tempo real está funcionando.',
    );
    console.log(
      '   Verifique os logs do servidor para ver as notificações PostgreSQL.',
    );
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar teste
testRealtimeSystem().catch(console.error);
