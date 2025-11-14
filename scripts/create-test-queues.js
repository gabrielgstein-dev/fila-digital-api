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

async function createTestQueues() {
  try {
    console.log('🏥 Criando filas de teste com novos tipos de serviço...');

    // Buscar o tenant padrão
    const tenant = await prisma.tenant.findFirst();
    if (!tenant) {
      throw new Error('Nenhum tenant encontrado. Execute primeiro insert-default-users.js');
    }

    console.log(`📍 Usando tenant: ${tenant.name}`);

    // Definir as filas de teste
    const queues = [
      {
        name: 'Consulta Geral',
        description: 'Consultas médicas gerais',
        queueType: 'GENERAL',
        serviceType: 'CONSULTA',
        capacity: 50,
        avgServiceTime: 900, // 15 minutos
        toleranceMinutes: 30,
      },
      {
        name: 'Consulta Prioritária',
        description: 'Consultas para idosos e gestantes',
        queueType: 'PRIORITY',
        serviceType: 'CONSULTA',
        capacity: 30,
        avgServiceTime: 900,
        toleranceMinutes: 45,
      },
      {
        name: 'Exames Laboratoriais',
        description: 'Coleta de sangue e exames simples',
        queueType: 'GENERAL',
        serviceType: 'EXAMES',
        capacity: 40,
        avgServiceTime: 300, // 5 minutos
        toleranceMinutes: 20,
      },
      {
        name: 'Balcão de Atendimento',
        description: 'Informações, agendamentos e documentação',
        queueType: 'GENERAL',
        serviceType: 'BALCAO',
        capacity: 60,
        avgServiceTime: 600, // 10 minutos
        toleranceMinutes: 25,
      },
      {
        name: 'Triagem',
        description: 'Triagem inicial e classificação de risco',
        queueType: 'PRIORITY',
        serviceType: 'TRIAGEM',
        capacity: 20,
        avgServiceTime: 180, // 3 minutos
        toleranceMinutes: 15,
      },
      {
        name: 'Caixa',
        description: 'Pagamentos e financeiro',
        queueType: 'GENERAL',
        serviceType: 'CAIXA',
        capacity: 25,
        avgServiceTime: 480, // 8 minutos
        toleranceMinutes: 20,
      },
      {
        name: 'Pediatria',
        description: 'Consultas pediátricas',
        queueType: 'PRIORITY',
        serviceType: 'PEDIATRIA',
        capacity: 30,
        avgServiceTime: 1200, // 20 minutos
        toleranceMinutes: 40,
      },
      {
        name: 'Urgência',
        description: 'Atendimento de urgência',
        queueType: 'VIP',
        serviceType: 'URGENCIA',
        capacity: 15,
        avgServiceTime: 1800, // 30 minutos
        toleranceMinutes: 60,
      },
    ];

    // Criar as filas
    for (const queueData of queues) {
      // Verificar se a fila já existe
      const existingQueue = await prisma.queue.findFirst({
        where: {
          name: queueData.name,
          tenantId: tenant.id,
        },
      });

      if (existingQueue) {
        console.log(`⏭️  Fila "${queueData.name}" já existe`);
        continue;
      }

      const queue = await prisma.queue.create({
        data: {
          ...queueData,
          tenantId: tenant.id,
        },
      });

      console.log(`✅ Fila criada: ${queue.name} (${queue.serviceType})`);
    }

    console.log('\n🎯 Resumo das filas criadas:');
    const allQueues = await prisma.queue.findMany({
      where: { tenantId: tenant.id },
      orderBy: { serviceType: 'asc' },
    });

    allQueues.forEach((queue) => {
      console.log(
        `  📋 ${queue.name} - Tipo: ${queue.serviceType} - Capacidade: ${queue.capacity} - Tolerância: ${queue.toleranceMinutes}min`
      );
    });

    console.log('\n🚀 Filas de teste criadas com sucesso!');
    console.log('\n💡 Para testar os tipos de senha, use os endpoints:');
    console.log('  GET /api/v1/queues/:id/qrcode - Gerar QR Code');
    console.log('  POST /api/v1/queues/:id/tickets - Criar ticket (senha)');
    console.log('  POST /api/v1/tenants/:tenantId/queues/:queueId/call-next - Chamar próximo');

  } catch (error) {
    console.error('❌ Erro ao criar filas de teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createTestQueues();
}

module.exports = { createTestQueues };



