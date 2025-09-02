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

async function createClient() {
  try {
    console.log('Conectando ao banco de dados...');

    // Verificar se o cliente já existe
    const existingClient = await prisma.user.findUnique({
      where: {
        cpf: '03445351180',
      },
    });

    if (existingClient) {
      console.log('Cliente já existe:', existingClient.id);
      console.log('Dados do cliente:');
      console.log('- ID:', existingClient.id);
      console.log('- Nome:', existingClient.name);
      console.log('- Email:', existingClient.email);
      console.log('- CPF:', existingClient.cpf);
      console.log('- Status:', existingClient.isActive ? 'Ativo' : 'Inativo');
      return;
    }

    // Criar senha criptografada
    const password = 'Teste@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar o cliente
    const client = await prisma.user.create({
      data: {
        email: 'cliente.teste@email.com',
        cpf: '03445351180',
        name: 'Cliente Teste',
        password: hashedPassword,
        isActive: true,
      },
    });

    console.log('✅ Cliente criado com sucesso!');
    console.log('📋 Dados do cliente:');
    console.log('- ID:', client.id);
    console.log('- Nome:', client.name);
    console.log('- Email:', client.email);
    console.log('- CPF:', client.cpf);
    console.log('- Status:', client.isActive ? 'Ativo' : 'Inativo');
    console.log('- Criado em:', client.createdAt);
    console.log('');
    console.log('🔑 Credenciais de teste:');
    console.log('- CPF: 03445351180');
    console.log('- Senha: Teste@123');
    console.log('');
    console.log(
      '💡 Use essas credenciais para testar o endpoint POST /api/v1/auth/client/login',
    );
  } catch (error) {
    console.error('❌ Erro ao criar cliente:', error.message);

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
createClient();
