const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://username:password@host:port/database?schema=public',
    },
  },
});

async function insertDefaultUsers() {
  try {
    console.log('Conectando ao banco de dados...');

    // Primeiro, vamos verificar se já existe um tenant, se não, criar um
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('Criando tenant padrão...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Estabelecimento Padrão',
          slug: 'estabelecimento-padrao',
          email: 'contato@estabelecimento.com',
          phone: '(11) 99999-9999',
          isActive: true,
        },
      });
      console.log('Tenant criado:', tenant.id);
    } else {
      console.log('Usando tenant existente:', tenant.id);
    }

    // Criar senha criptografada
    const password = 'Padrao@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Verificar se o cliente padrão já existe
    let defaultClient = await prisma.user.findUnique({
      where: { cpf: '00000000001' },
    });

    if (!defaultClient) {
      console.log('Criando cliente padrão...');
      defaultClient = await prisma.user.create({
        data: {
          id: 'default-client-001',
          email: 'cliente.padrao@fila.com',
          cpf: '00000000001',
          name: 'Cliente Padrão',
          password: hashedPassword,
          isActive: true,
          isDefault: true,
          isProtected: true,
        },
      });
      console.log('✅ Cliente padrão criado:', defaultClient.id);
    } else {
      console.log('Cliente padrão já existe:', defaultClient.id);
    }

    // Verificar se o agente padrão já existe
    let defaultAgent = await prisma.agent.findUnique({
      where: { cpf: '00000000002' },
    });

    if (!defaultAgent) {
      console.log('Criando agente padrão...');
      defaultAgent = await prisma.agent.create({
        data: {
          id: 'default-agent-001',
          email: 'atendente.padrao@fila.com',
          cpf: '00000000002',
          name: 'Atendente Padrão',
          password: hashedPassword,
          role: 'OPERADOR',
          isActive: true,
          isDefault: true,
          isProtected: true,
          tenantId: tenant.id,
        },
      });
      console.log('✅ Agente padrão criado:', defaultAgent.id);
    } else {
      console.log('Agente padrão já existe:', defaultAgent.id);
    }

    console.log('');
    console.log('🔑 Credenciais dos usuários padrão:');
    console.log('');
    console.log('👤 Cliente Padrão:');
    console.log('- CPF: 00000000001');
    console.log('- Senha: Padrao@123');
    console.log('- Endpoint: POST /api/v1/auth/client/login');
    console.log('');
    console.log('👨‍💼 Atendente Padrão:');
    console.log('- CPF: 00000000002');
    console.log('- Senha: Padrao@123');
    console.log('- Endpoint: POST /api/v1/auth/login');
    console.log('');
    console.log('💡 Estes usuários são protegidos contra exclusão!');
  } catch (error) {
    console.error('❌ Erro ao inserir usuários padrão:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
insertDefaultUsers();

