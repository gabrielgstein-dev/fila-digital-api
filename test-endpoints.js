const axios = require('axios');

const baseURL = 'http://localhost:3001/api/v1';

async function testEndpoints() {
  console.log('🧪 Testando endpoints de autenticação...\n');

  try {
    // Teste 1: Health Check
    console.log('1️⃣ Testando Health Check...');
    const healthResponse = await axios.get(`${baseURL}/health`);
    console.log('✅ Health Check:', healthResponse.status, healthResponse.data);
    console.log('');

    // Teste 2: Login Cliente
    console.log('2️⃣ Testando Login Cliente...');
    const clientData = {
      cpf: '00000000001',
      password: 'Padrao@123',
    };

    console.log('📤 Dados enviados:', JSON.stringify(clientData, null, 2));
    console.log('🌐 URL:', `${baseURL}/auth/client/login`);

    const clientResponse = await axios.post(
      `${baseURL}/auth/client/login`,
      clientData,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    console.log('✅ Login Cliente:', clientResponse.status);
    console.log(
      '🔑 Token recebido:',
      clientResponse.data.access_token ? 'SIM' : 'NÃO',
    );
    console.log('👤 Tipo de usuário:', clientResponse.data.userType);
    console.log('');

    // Teste 3: Login Atendente
    console.log('3️⃣ Testando Login Atendente...');
    const agentData = {
      cpf: '00000000002',
      password: 'Padrao@123',
    };

    console.log('📤 Dados enviados:', JSON.stringify(agentData, null, 2));
    console.log('🌐 URL:', `${baseURL}/auth/login`);

    const agentResponse = await axios.post(`${baseURL}/auth/login`, agentData, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('✅ Login Atendente:', agentResponse.status);
    console.log(
      '🔑 Token recebido:',
      agentResponse.data.access_token ? 'SIM' : 'NÃO',
    );
    console.log('👤 Tipo de usuário:', agentResponse.data.userType);
    console.log('');

    console.log('🎉 Todos os testes passaram!');
  } catch (error) {
    console.error('❌ Erro nos testes:', error.message);

    if (error.response) {
      console.error('📊 Status:', error.response.status);
      console.error('📋 Dados:', error.response.data);
      console.error('🔍 Headers:', error.response.headers);
    }
  }
}

// Executar testes
testEndpoints();

