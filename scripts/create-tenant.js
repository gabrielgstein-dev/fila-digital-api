const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://username:password@host:port/database?schema=public',
    },
  },
});

async function createTestTenant() {
  try {
    console.log('🏢 Criando tenant de teste...');

    const testTenant = await prisma.tenant.create({
      data: {
        name: 'Estabelecimento de Teste',
        slug: 'estabelecimento-teste',
        email: 'teste@estabelecimento.com',
        phone: '(11) 88888-8888',
        isActive: true,
      },
    });

    console.log('✅ Tenant de teste criado com sucesso!');
    console.log('');
    console.log('📋 Detalhes do Tenant:');
    console.log(`- ID: ${testTenant.id}`);
    console.log(`- Nome: ${testTenant.name}`);
    console.log(`- Slug: ${testTenant.slug}`);
    console.log(`- Email: ${testTenant.email}`);
    console.log(`- Telefone: ${testTenant.phone}`);
    console.log(`- Status: ${testTenant.isActive ? 'Ativo' : 'Inativo'}`);
    console.log(`- Criado em: ${testTenant.createdAt.toLocaleString('pt-BR')}`);
    console.log('');

    console.log('💡 Para usar este tenant:');
    console.log('- Use o ID do tenant ao criar filas, agentes ou tickets');
    console.log('- O slug pode ser usado para identificação única');
    console.log('- Todos os recursos criados serão vinculados a este tenant');
  } catch (error) {
    if (error.code === 'P2002') {
      console.error('❌ Erro: Já existe um tenant com este slug ou email!');
      console.error('💡 Tente usar um slug ou email diferente.');
    } else {
      console.error('❌ Erro ao criar tenant de teste:', error.message);
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

async function listAllTenants() {
  try {
    console.log('📋 Listando todos os tenants existentes...');

    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (tenants.length === 0) {
      console.log('Nenhum tenant encontrado.');
      return;
    }

    console.log('');
    tenants.forEach((tenant, index) => {
      console.log(`${index + 1}. ${tenant.name}`);
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Slug: ${tenant.slug}`);
      console.log(`   Email: ${tenant.email || 'N/A'}`);
      console.log(`   Status: ${tenant.isActive ? '✅ Ativo' : '❌ Inativo'}`);
      console.log(`   Criado: ${tenant.createdAt.toLocaleString('pt-BR')}`);
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erro ao listar tenants:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function deleteTestTenant() {
  try {
    console.log('🗑️  Procurando tenant de teste para exclusão...');

    const testTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { slug: 'estabelecimento-teste' },
          { name: 'Estabelecimento de Teste' },
        ],
      },
    });

    if (!testTenant) {
      console.log('❌ Tenant de teste não encontrado.');
      return;
    }

    console.log(
      `⚠️  Excluindo tenant: ${testTenant.name} (ID: ${testTenant.id})`,
    );

    await prisma.tenant.delete({
      where: { id: testTenant.id },
    });

    console.log('✅ Tenant de teste excluído com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao excluir tenant de teste:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

const command = process.argv[2];

switch (command) {
  case 'create':
    createTestTenant();
    break;
  case 'list':
    listAllTenants();
    break;
  case 'delete':
    deleteTestTenant();
    break;
  default:
    console.log('🏢 Script de Gerenciamento de Tenants');
    console.log('');
    console.log('Uso:');
    console.log('  node create-tenant.js create  - Criar tenant de teste');
    console.log('  node create-tenant.js list    - Listar todos os tenants');
    console.log('  node create-tenant.js delete  - Excluir tenant de teste');
    console.log('');
    console.log('Exemplos:');
    console.log('  node create-tenant.js create');
    console.log('  node create-tenant.js list');
    console.log('  node create-tenant.js delete');
}
