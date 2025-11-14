#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testTicketCreation() {
  try {
    const queue = await prisma.queue.findFirst({
      where: { id: 'cmhxuhwyx0007ax3suaotyf4a' },
    });

    if (!queue) {
      console.log('❌ Fila não encontrada');
      return;
    }

    console.log('✅ Fila encontrada:', queue.name);
    console.log('📋 Criando ticket diretamente...\n');

    const ticketData = {
      clientName: 'Teste Direto',
      clientPhone: '(11) 99999-9999',
      priority: 1,
      queueId: queue.id,
      myCallingToken: 'G999',
      estimatedTime: 300,
      userId: null,
      status: 'WAITING',
    };

    console.log('📦 Dados do ticket:', JSON.stringify(ticketData, null, 2));
    console.log('\n🔄 Tentando criar ticket...\n');

    const ticket = await prisma.ticket.create({
      data: ticketData,
    });

    console.log('✅ Ticket criado com sucesso!');
    console.log('ID:', ticket.id);
    console.log('Token:', ticket.myCallingToken);

    await prisma.ticket.delete({
      where: { id: ticket.id },
    });

    console.log('\n🧹 Ticket de teste removido');
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testTicketCreation();
