const axios = require('axios');

async function testAPICapacity() {
  const baseURL = 'http://localhost:3000/api/v1';
  
  try {
    // Primeiro, fazer login para obter token
    console.log('🔐 Fazendo login...');
    
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: 'admin@admin.com',
      password: 'admin123'
    });
    
    const token = loginResponse.data.access_token;
    const tenantId = loginResponse.data.user.tenantId;
    
    console.log('✅ Login realizado, tenant:', tenantId);
    
    // Criar fila via API SEM capacity e avgServiceTime
    console.log('\n🧪 Criando fila via API SEM capacity/avgServiceTime...');
    
    const createQueueResponse = await axios.post(
      `${baseURL}/tenants/${tenantId}/queues`,
      {
        name: 'API Test Queue',
        description: 'Teste via API para capacity',
        // NÃO passando capacity nem avgServiceTime
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Fila criada via API:', {
      id: createQueueResponse.data.id,
      name: createQueueResponse.data.name,
      capacity: createQueueResponse.data.capacity,
      avgServiceTime: createQueueResponse.data.avgServiceTime,
    });
    
    // Fazer GET da fila via API
    console.log('\n🔍 Fazendo GET da fila via API...');
    
    const getQueueResponse = await axios.get(
      `${baseURL}/tenants/${tenantId}/queues/${createQueueResponse.data.id}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    console.log('📋 Fila recuperada via API:', {
      id: getQueueResponse.data.id,
      name: getQueueResponse.data.name,
      capacity: getQueueResponse.data.capacity,
      avgServiceTime: getQueueResponse.data.avgServiceTime,
    });
    
    // Limpar teste
    console.log('\n🧹 Limpando dados de teste...');
    // Note: Não há endpoint DELETE, então vamos desativar a fila
    // ou deixar para limpeza manual
    
    console.log('✅ Teste API concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste API:', error.response?.data || error.message);
  }
}

testAPICapacity();

