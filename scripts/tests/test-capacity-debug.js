const { PrismaClient } = require('@prisma/client');

async function testCapacityIssue() {
  const prisma = new PrismaClient();
  
  try {
    // Buscar um tenant existente
    console.log('🔍 Buscando tenant existente...');
    const tenant = await prisma.tenant.findFirst();
    
    if (!tenant) {
      console.log('❌ Nenhum tenant encontrado');
      return;
    }
    
    console.log('✅ Tenant encontrado:', tenant.id);
    
    // Criar fila SEM capacity
    console.log('\n🧪 Criando fila SEM capacity...');
    const newQueue = await prisma.queue.create({
      data: {
        name: 'Debug Capacity Test',
        description: 'Teste para debugar capacity',
        tenantId: tenant.id,
        // NÃO passando capacity nem avgServiceTime
      },
    });
    
    console.log('✅ Fila criada:', {
      id: newQueue.id,
      name: newQueue.name,
      capacity: newQueue.capacity,
      avgServiceTime: newQueue.avgServiceTime,
    });
    
    // Fazer GET da fila criada
    console.log('\n🔍 Fazendo GET da fila criada...');
    const retrievedQueue = await prisma.queue.findUnique({
      where: { id: newQueue.id }
    });
    
    console.log('📋 Fila recuperada:', {
      id: retrievedQueue.id,
      name: retrievedQueue.name,
      capacity: retrievedQueue.capacity,
      avgServiceTime: retrievedQueue.avgServiceTime,
    });
    
    // Verificar diretamente no banco
    console.log('\n🔍 Consultando diretamente no banco...');
    const rawResult = await prisma.$queryRaw`
      SELECT id, name, capacity, "avgServiceTime" 
      FROM queues 
      WHERE id = ${newQueue.id}
    `;
    
    console.log('🗄️ Resultado direto do banco:', rawResult[0]);
    
    // Limpar teste
    console.log('\n🧹 Limpando dados de teste...');
    await prisma.queue.delete({
      where: { id: newQueue.id }
    });
    
    console.log('✅ Teste concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testCapacityIssue();

