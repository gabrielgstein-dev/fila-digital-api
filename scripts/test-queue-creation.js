#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testQueueCreation() {
  try {
    const tenant = await prisma.tenant.findFirst({
      where: { slug: 'empresa-107' },
    });

    if (!tenant) {
      console.log('❌ Tenant não encontrado');
      return;
    }

    console.log('\n🧪 Testando criação de fila...\n');

    const queue1 = await prisma.queue.create({
      data: {
        name: 'Fila Teste - Sem isActive',
        description: 'Teste sem passar isActive',
        tenantId: tenant.id,
      },
    });

    console.log('✅ Fila criada sem isActive:');
    console.log('  - ID:', queue1.id);
    console.log(
      '  - isActive:',
      queue1.isActive,
      '(tipo:',
      typeof queue1.isActive + ')',
    );
    console.log('  - Esperado: true\n');

    if (queue1.isActive !== true) {
      console.log('❌ ERRO: Fila deveria ser criada com isActive: true');
    }

    const queue2 = await prisma.queue.create({
      data: {
        name: 'Fila Teste - Com isActive: false',
        description: 'Teste passando isActive: false',
        tenantId: tenant.id,
        isActive: false,
      },
    });

    console.log('✅ Fila criada com isActive: false:');
    console.log('  - ID:', queue2.id);
    console.log(
      '  - isActive:',
      queue2.isActive,
      '(tipo:',
      typeof queue2.isActive + ')',
    );
    console.log('  - Esperado: false\n');

    if (queue2.isActive !== false) {
      console.log('❌ ERRO: Fila deveria ser criada com isActive: false');
    }

    const queue3 = await prisma.queue.create({
      data: {
        name: 'Fila Teste - Com isActive: true',
        description: 'Teste passando isActive: true',
        tenantId: tenant.id,
        isActive: true,
      },
    });

    console.log('✅ Fila criada com isActive: true:');
    console.log('  - ID:', queue3.id);
    console.log(
      '  - isActive:',
      queue3.isActive,
      '(tipo:',
      typeof queue3.isActive + ')',
    );
    console.log('  - Esperado: true\n');

    if (queue3.isActive !== true) {
      console.log('❌ ERRO: Fila deveria ser criada com isActive: true');
    }

    console.log('🧹 Limpando filas de teste...\n');
    await prisma.queue.deleteMany({
      where: {
        id: { in: [queue1.id, queue2.id, queue3.id] },
      },
    });

    console.log('✅ Teste concluído!\n');
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

testQueueCreation();
