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

async function checkTestData() {
  try {
    console.log('🔍 Verificando dados para teste...\n');

    const tenants = await prisma.tenant.findMany({
      where: { isActive: true },
      include: {
        queues: {
          where: { isActive: true },
          include: {
            tickets: {
              take: 5,
              orderBy: { createdAt: 'desc' },
            },
            state: true,
          },
        },
        corporateUsers: {
          where: { isActive: true },
          take: 3,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (tenants.length === 0) {
      console.log('❌ Nenhum tenant ativo encontrado!');
      console.log('\n💡 Para criar um tenant de teste, execute:');
      console.log('   node scripts/create-tenant.js create');
      return;
    }

    console.log(`✅ Encontrados ${tenants.length} tenant(s) ativo(s)\n`);

    for (const tenant of tenants) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`🏢 TENANT: ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Slug: ${tenant.slug}`);
      console.log(`   Email: ${tenant.email || 'N/A'}`);
      console.log(`   Status: ${tenant.isActive ? '✅ Ativo' : '❌ Inativo'}`);

      if (tenant.queues.length === 0) {
        console.log(`\n   ⚠️  Nenhuma fila encontrada para este tenant!`);
        console.log(`   💡 Para criar filas de teste, execute:`);
        console.log(`      node scripts/create-test-queues.js`);
      } else {
        console.log(`\n   📋 Filas (${tenant.queues.length}):`);
        tenant.queues.forEach((queue, idx) => {
          const ticketCount = queue.tickets.length;
          const state = queue.state;
          const currentTicket = state?.currentTicketId
            ? `Ticket atual: ${state.currentTicketId.substring(0, 8)}...`
            : 'Nenhum ticket em atendimento';

          console.log(`\n   ${idx + 1}. ${queue.name}`);
          console.log(`      ID: ${queue.id}`);
          console.log(`      Tipo: ${queue.serviceType} (${queue.queueType})`);
          console.log(`      Capacidade: ${queue.capacity || 'Ilimitada'}`);
          console.log(
            `      Status: ${queue.isActive ? '✅ Ativa' : '❌ Inativa'}`,
          );
          console.log(`      Tickets recentes: ${ticketCount}`);
          console.log(`      Estado: ${currentTicket}`);

          if (queue.tickets.length > 0) {
            console.log(`      Últimos tickets:`);
            queue.tickets.forEach((ticket) => {
              console.log(
                `         - ${ticket.myCallingToken} (${ticket.status}) - Criado: ${ticket.createdAt.toLocaleString('pt-BR')}`,
              );
            });
          }
        });
      }

      if (tenant.corporateUsers.length > 0) {
        console.log(
          `\n   👥 Usuários corporativos (${tenant.corporateUsers.length}):`,
        );
        tenant.corporateUsers.forEach((user) => {
          console.log(`      - ${user.name} (${user.email}) - ${user.role}`);
        });
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    const tenantWithQueue = tenants.find((t) => t.queues.length > 0);

    if (tenantWithQueue && tenantWithQueue.queues.length > 0) {
      const queue = tenantWithQueue.queues[0];
      console.log('✅ DADOS DISPONÍVEIS PARA TESTE:');
      console.log(`\n   Tenant ID: ${tenantWithQueue.id}`);
      console.log(`   Tenant Nome: ${tenantWithQueue.name}`);
      console.log(`   Fila ID: ${queue.id}`);
      console.log(`   Fila Nome: ${queue.name}`);
      console.log(`\n   💡 Para testar o fluxo de ticket:`);
      console.log(
        `   1. Use o endpoint POST /api/v1/queues/${queue.id}/tickets`,
      );
      console.log(`   2. Isso criará um ticket na fila`);
      console.log(
        `   3. O backoffice deve receber a atualização via SSE`,
      );
    } else {
      console.log('⚠️  Nenhum tenant com fila encontrado para teste!');
      console.log('\n   💡 Para criar dados de teste:');
      console.log('   1. node scripts/create-tenant.js create');
      console.log('   2. node scripts/create-test-queues.js');
    }
  } catch (error) {
    console.error('❌ Erro ao verificar dados:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

checkTestData();
