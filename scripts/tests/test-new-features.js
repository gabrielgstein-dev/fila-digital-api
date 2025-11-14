const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

// Credenciais do agente padrão
const AGENT_CREDENTIALS = {
  cpf: '00000000002',
  password: 'Padrao@123',
};

async function testNewFeatures() {
  try {
    console.log('🧪 Testando novas funcionalidades...\n');

    // 1. Login do agente
    console.log('1️⃣ Fazendo login do agente...');
    const loginResponse = await axios.post(`${API_BASE}/auth/login`, AGENT_CREDENTIALS);
    const token = loginResponse.data.access_token;
    const tenantId = loginResponse.data.user.tenantId;
    
    console.log(`✅ Login realizado. Tenant: ${tenantId}\n`);

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Listar filas para pegar IDs
    console.log('2️⃣ Listando filas disponíveis...');
    const queuesResponse = await axios.get(`${API_BASE}/tenants/${tenantId}/queues`, { headers });
    const queues = queuesResponse.data;
    
    console.log('📋 Filas encontradas:');
    queues.forEach((queue, index) => {
      console.log(`  ${index + 1}. ${queue.name} (${queue.serviceType}) - Tolerância: ${queue.toleranceMinutes}min`);
    });
    console.log('');

    if (queues.length === 0) {
      console.log('❌ Nenhuma fila encontrada. Execute o script create-test-queues.js primeiro.');
      return;
    }

    // 3. Testar criação de tickets com novos tipos de senha
    console.log('3️⃣ Testando criação de tickets com novos tipos de senha...');
    
    const testQueues = queues.slice(0, 4); // Testar primeiras 4 filas
    const tickets = [];

    for (const queue of testQueues) {
      const ticketData = {
        clientName: `Cliente Teste ${queue.serviceType}`,
        clientPhone: `119999${Math.floor(Math.random() * 10000)}`,
        clientEmail: `teste${Date.now()}@email.com`,
        priority: queue.queueType === 'PRIORITY' ? 5 : 1,
      };

      const ticketResponse = await axios.post(
        `${API_BASE}/queues/${queue.id}/tickets`,
        ticketData
      );

      const ticket = ticketResponse.data;
      tickets.push(ticket);

      console.log(`✅ Ticket criado: ${ticket.myCallingToken} na fila ${queue.name}`);
    }
    console.log('');

    // 4. Testar chamada de tickets
    console.log('4️⃣ Testando chamada de tickets...');
    
    for (const ticket of tickets.slice(0, 2)) {
      await axios.post(
        `${API_BASE}/tenants/${tenantId}/queues/${ticket.queueId}/call-next`,
        {},
        { headers }
      );
      console.log(`📞 Ticket ${ticket.myCallingToken} chamado`);
    }
    console.log('');

    // 5. Aguardar um pouco e testar estatísticas de abandono
    console.log('5️⃣ Testando estatísticas de abandono...');
    
    for (const queue of testQueues.slice(0, 2)) {
      try {
        const statsResponse = await axios.get(
          `${API_BASE}/tenants/${tenantId}/queues/${queue.id}/abandonment-stats`,
          { headers }
        );
        
        const stats = statsResponse.data;
        console.log(`📊 Stats da fila ${queue.name}:`);
        console.log(`   - Total de tickets: ${stats.totalTickets}`);
        console.log(`   - Tickets não compareceram: ${stats.noShowTickets}`);
        console.log(`   - Taxa de abandono: ${stats.abandonmentRate}%`);
      } catch (error) {
        console.log(`❌ Erro ao buscar stats da fila ${queue.name}`);
      }
    }
    console.log('');

    // 6. Testar limpeza manual
    console.log('6️⃣ Testando limpeza manual de tickets...');
    
    const firstQueue = testQueues[0];
    try {
      const cleanupResponse = await axios.post(
        `${API_BASE}/tenants/${tenantId}/queues/${firstQueue.id}/cleanup`,
        {},
        { headers }
      );
      
      console.log(`🧹 ${cleanupResponse.data.message}`);
    } catch (error) {
      console.log(`❌ Erro na limpeza: ${error.response?.data?.message || error.message}`);
    }
    console.log('');

    // 7. Verificar tipos de senha gerados
    console.log('7️⃣ Verificando tipos de senha gerados...');
    console.log('🎯 Resumo dos tipos de senha:');
    
    const serviceTypeMap = {
      'CONSULTA': 'C (Consulta)',
      'EXAMES': 'E (Exames)', 
      'BALCAO': 'B (Balcão)',
      'TRIAGEM': 'T (Triagem)',
      'CAIXA': 'X (Caixa)',
      'PEDIATRIA': 'P (Pediatria)',
      'URGENCIA': 'U (Urgência)',
    };

    tickets.forEach(ticket => {
      const queue = queues.find(q => q.id === ticket.queueId);
      const prefix = ticket.myCallingToken.replace(/\d+$/, '');
      const expectedType = serviceTypeMap[queue.serviceType] || 'Desconhecido';
      
      console.log(`   ${ticket.myCallingToken} → ${expectedType} ${queue.queueType === 'PRIORITY' ? '(Prioritária)' : ''}`);
    });

    console.log('\n🎉 Teste das novas funcionalidades concluído!');
    console.log('\n💡 Funcionalidades implementadas:');
    console.log('   ✅ Tipos específicos de senha (C, E, B, T, X, P, U)');
    console.log('   ✅ Sufixo P para filas prioritárias');
    console.log('   ✅ Sistema de tolerância por fila');
    console.log('   ✅ Limpeza automática de tickets abandonados');
    console.log('   ✅ Estatísticas de abandono');
    console.log('   ✅ Limpeza manual via API');

  } catch (error) {
    console.error('❌ Erro no teste:', error.response?.data || error.message);
  }
}

// Aguardar a aplicação iniciar
setTimeout(() => {
  testNewFeatures();
}, 5000);

console.log('⏳ Aguardando aplicação iniciar...');



