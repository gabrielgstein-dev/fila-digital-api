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

async function createAgent() {
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

    // Verificar se o agente já existe
    const existingAgent = await prisma.agent.findUnique({
      where: {
        cpf: '03445351180',
      },
    });

    if (existingAgent) {
      console.log('Agente já existe:', existingAgent.id);
      console.log('Dados do agente:');
      console.log('- ID:', existingAgent.id);
      console.log('- Nome:', existingAgent.name);
      console.log('- Email:', existingAgent.email);
      console.log('- CPF:', existingAgent.cpf);
      console.log('- Role:', existingAgent.role);
      console.log('- Status:', existingAgent.isActive ? 'Ativo' : 'Inativo');
      return;
    }

    // Criar senha criptografada
    const password = 'Teste@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o agente
    const agent = await prisma.agent.create({
      data: {
        email: 'usuario.teste@email.com',
        cpf: '03445351180',
        name: 'Usuário Teste',
        password: hashedPassword,
        role: 'ATTENDANT',
        isActive: true,
        tenantId: tenant.id,
      },
    });

    console.log('✅ Agente criado com sucesso!');
    console.log('📋 Dados do agente:');
    console.log('- ID:', agent.id);
    console.log('- Nome:', agent.name);
    console.log('- Email:', agent.email);
    console.log('- CPF:', agent.cpf);
    console.log('- Role:', agent.role);
    console.log('- Status:', agent.isActive ? 'Ativo' : 'Inativo');
    console.log('- Tenant ID:', agent.tenantId);
    console.log('- Criado em:', agent.createdAt);
    console.log('');
    console.log('🔑 Credenciais de teste:');
    console.log('- CPF: 03445351180');
    console.log('- Senha: Teste@123');
    console.log('');
    console.log(
      '💡 Use essas credenciais para testar o endpoint POST /api/v1/auth/login',
    );
  } catch (error) {
    console.error('❌ Erro ao criar agente:', error.message);

    if (error.code === 'P1001') {
      console.error(
        '💡 Dica: Verifique se a DATABASE_URL está configurada corretamente',
      );
      console.error(
        '💡 Exemplo: DATABASE_URL="postgresql://user:password@host:port/database?schema=public"',
      );
    }

    if (error.code === 'P2002') {
      console.error('💡 Dica: Já existe um usuário com este email ou CPF');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Executar o script
createAgent();
