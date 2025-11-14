#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkQueueStatus() {
  const queueId = process.argv[2] || 'cmhxuhwyx0007ax3suaotyf4a';

  try {
    const queue = await prisma.queue.findUnique({
      where: { id: queueId },
      include: {
        tenant: true,
      },
    });

    if (!queue) {
      console.log('❌ Fila não encontrada');
      return;
    }

    console.log('\n📋 Status da Fila:');
    console.log('ID:', queue.id);
    console.log('Nome:', queue.name);
    console.log('isActive (valor):', queue.isActive);
    console.log('isActive (tipo):', typeof queue.isActive);
    console.log('isActive (JSON):', JSON.stringify(queue.isActive));
    console.log('\n🏢 Status do Tenant:');
    console.log('ID:', queue.tenant.id);
    console.log('Nome:', queue.tenant.name);
    console.log('isActive (valor):', queue.tenant.isActive);
    console.log('isActive (tipo):', typeof queue.tenant.isActive);
    console.log('isActive (JSON):', JSON.stringify(queue.tenant.isActive));

    console.log('\n✅ Validação:');
    console.log('Fila ativa?', queue.isActive === true);
    console.log('Tenant ativo?', queue.tenant.isActive === true);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkQueueStatus();
