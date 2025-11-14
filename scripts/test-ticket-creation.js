const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://username:password@host:port/database?schema=public',
    },
  },
});

async function testTicketCreation() {
  try {
    console.log('🎫 Teste de Criação de Ticket\n');

    const tenant = await prisma.tenant.findFirst({
      where: { isActive: true },
      include: {
        queues: {
          where: { isActive: true },
          take: 1,
        },
      },
    });

    if (!tenant) {
      console.log('❌ Nenhum tenant encontrado!');
      return;
    }

    if (tenant.queues.length === 0) {
      console.log('❌ Nenhuma fila encontrada para este tenant!');
      console.log('💡 Execute: node scripts/create-test-queues.js');
      return;
    }

    const queue = tenant.queues[0];

    console.log('📋 Dados para Teste:');
    console.log(`   Tenant: ${tenant.name} (${tenant.id})`);
    console.log(`   Fila: ${queue.name} (${queue.id})`);
    console.log(`   Tipo: ${queue.serviceType}`);
    console.log('');

    console.log('🔗 Endpoint para criar ticket:');
    console.log(
      `   POST http://localhost:3001/api/v1/queues/${queue.id}/tickets`,
    );
    console.log('');

    console.log('📝 Exemplo de requisição (curl):');
    console.log(
      `curl -X POST http://localhost:3001/api/v1/queues/${queue.id}/tickets \\`,
    );
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{`);
    console.log(`    "clientName": "João Silva",`);
    console.log(`    "clientPhone": "(11) 99999-8888",`);
    console.log(`    "priority": 1`);
    console.log(`  }'`);
    console.log('');

    console.log('📝 Exemplo de requisição (fetch/JavaScript):');
    console.log(
      `const response = await fetch('http://localhost:3001/api/v1/queues/${queue.id}/tickets', {`,
    );
    console.log(`  method: 'POST',`);
    console.log(`  headers: { 'Content-Type': 'application/json' },`);
    console.log(`  body: JSON.stringify({`);
    console.log(`    clientName: 'João Silva',`);
    console.log(`    clientPhone: '(11) 99999-8888',`);
    console.log(`    priority: 1`);
    console.log(`  })`);
    console.log(`});`);
    console.log('');

    console.log('✅ Resposta esperada:');
    console.log(`{`);
    console.log(`  "id": "ticket-id",`);
    console.log(`  "myCallingToken": "A001",`);
    console.log(`  "position": 1,`);
    console.log(`  "estimatedTime": 15,`);
    console.log(`  "queueName": "${queue.name}",`);
    console.log(`  "status": "WAITING"`);
    console.log(`}`);
    console.log('');

    console.log('🔍 Para verificar se o backoffice recebeu a atualização:');
    console.log('   1. Abra o backoffice no navegador');
    console.log(`   2. Navegue até a fila: ${queue.name}`);
    console.log('   3. Execute o comando curl acima em outro terminal');
    console.log(
      '   4. O backoffice deve atualizar automaticamente mostrando o novo ticket',
    );
    console.log('');

    const existingTickets = await prisma.ticket.findMany({
      where: {
        queueId: queue.id,
        status: 'WAITING',
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    if (existingTickets.length > 0) {
      console.log('📊 Tickets atuais na fila (WAITING):');
      existingTickets.forEach((ticket, idx) => {
        console.log(
          `   ${idx + 1}. ${ticket.myCallingToken} - ${ticket.clientName || 'Sem nome'} - Criado: ${ticket.createdAt.toLocaleString('pt-BR')}`,
        );
      });
      console.log('');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketCreation();
