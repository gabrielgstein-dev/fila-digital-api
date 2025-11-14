#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testRawSQL() {
  try {
    const queue = await prisma.queue.findFirst({
      where: { id: 'cmhxuhwyx0007ax3suaotyf4a' },
    });

    if (!queue) {
      console.log('❌ Fila não encontrada');
      return;
    }

    console.log('✅ Fila encontrada:', queue.name);
    console.log('📋 Testando inserção SQL direta...\n');

    const result = await prisma.$queryRaw`
      INSERT INTO tickets (
        id,
        "clientName",
        "clientPhone",
        priority,
        status,
        "queueId",
        "myCallingToken",
        "estimatedTime",
        "userId",
        "createdAt",
        "updatedAt"
      ) VALUES (
        gen_random_uuid()::text,
        'Teste SQL Direto',
        '(11) 88888-8888',
        1,
        'WAITING',
        ${queue.id},
        'G888',
        300,
        NULL,
        NOW(),
        NOW()
      ) RETURNING id, "myCallingToken";
    `;

    console.log('✅ Ticket criado via SQL direto!');
    console.log('Resultado:', JSON.stringify(result, null, 2));

    if (result && result[0]) {
      await prisma.$executeRaw`
        DELETE FROM tickets WHERE id = ${result[0].id}
      `;
      console.log('\n🧹 Ticket de teste removido');
    }
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

testRawSQL();
