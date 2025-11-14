#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixQueueActive() {
  const queueId = process.argv[2] || 'cmhxuhwyx0007ax3suaotyf4a';

  try {
    const queue = await prisma.queue.update({
      where: { id: queueId },
      data: { isActive: true },
    });

    console.log('✅ Fila atualizada com sucesso!');
    console.log('ID:', queue.id);
    console.log('Nome:', queue.name);
    console.log('isActive:', queue.isActive);
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixQueueActive();
