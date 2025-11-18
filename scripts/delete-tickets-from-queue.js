#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function deleteTicketsFromQueue() {
  const queueId = process.argv[2];

  if (!queueId) {
    console.error('❌ Erro: ID da fila é obrigatório');
    console.log('Uso: node scripts/delete-tickets-from-queue.js <queueId>');
    process.exit(1);
  }

  try {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: true,
      },
    });

    if (!queue) {
      console.log(`❌ Fila com ID ${queueId} não encontrada`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log('\n📋 Informações da Fila:');
    console.log('ID:', queue.id);
    console.log('Nome:', queue.name);
    console.log('Tenant:', queue.tenant.name);
    console.log('');

    const ticketCount = await prisma.ticket.count({
      where: { queueId },
    });

    console.log(`📊 Total de tickets encontrados: ${ticketCount}`);

    if (ticketCount === 0) {
      console.log('✅ Nenhum ticket para deletar');
      await prisma.$disconnect();
      return;
    }

    const ticketSample = await prisma.ticket.findMany({
      where: { queueId },
      take: 5,
      select: {
        id: true,
        myCallingToken: true,
        status: true,
        clientName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('\n📝 Exemplos de tickets que serão deletados:');
    ticketSample.forEach((ticket, index) => {
      console.log(
        `  ${index + 1}. ${ticket.myCallingToken} - ${ticket.status} - ${ticket.clientName || 'Sem nome'}`,
      );
    });

    if (ticketCount > 5) {
      console.log(`  ... e mais ${ticketCount - 5} tickets`);
    }

    console.log('\n⚠️  ATENÇÃO: Esta ação é irreversível!');
    console.log(
      `Você está prestes a deletar ${ticketCount} tickets da fila "${queue.name}"`,
    );

    const result = await prisma.ticket.deleteMany({
      where: { queueId },
    });

    console.log(`\n✅ ${result.count} tickets deletados com sucesso!`);
  } catch (error) {
    console.error('❌ Erro ao deletar tickets:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

deleteTicketsFromQueue();
