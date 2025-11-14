#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkTriggers() {
  try {
    const triggers = await prisma.$queryRaw`
      SELECT
        trigger_name,
        event_manipulation,
        event_object_table,
        action_statement
      FROM information_schema.triggers
      WHERE event_object_table = 'tickets'
      ORDER BY trigger_name;
    `;

    console.log('\n🔍 Triggers na tabela tickets:\n');
    console.log(JSON.stringify(triggers, null, 2));
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkTriggers();
