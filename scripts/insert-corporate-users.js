const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://fila_digital_qa_user:9MNgQAtAv96dQ69qcwnsgOsPvfAVbgEV@dpg-d2i7luv5r7bs73f6s5kg-a.oregon-postgres.render.com/fila_digital_qa?schema=public',
    },
  },
});

async function insertCorporateUsers() {
  try {
    console.log('Conectando ao banco de dados...');

    // Primeiro, vamos verificar se já existe um tenant, se não, criar um
    let tenant = await prisma.tenant.findFirst();

    if (!tenant) {
      console.log('Criando tenant padrão...');
      tenant = await prisma.tenant.create({
        data: {
          name: 'Empresa Corporativa Padrão',
          slug: 'empresa-corporativa-padrao',
          email: 'contato@empresacorporativa.com',
          phone: '(11) 99999-9999',
          isActive: true,
        },
      });
      console.log('Tenant criado:', tenant.id);
    } else {
      console.log('Usando tenant existente:', tenant.id);
    }

    // Criar senha criptografada
    const password = 'Corporativo@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    // Array de usuários corporativos padrão
    const defaultCorporateUsers = [
      {
        id: 'default-admin-001',
        email: 'admin@empresacorporativa.com',
        cpf: '11111111111',
        name: 'Administrador Corporativo',
        role: 'ADMINISTRADOR',
        department: 'TI',
        position: 'Diretor de TI',
        isActive: true,
        isDefault: true,
        isProtected: true,
      },
      {
        id: 'default-gestor-001',
        email: 'gestor@empresacorporativa.com',
        cpf: '22222222222',
        name: 'Gestor Corporativo',
        role: 'GESTOR',
        department: 'Operações',
        position: 'Gerente de Operações',
        isActive: true,
        isDefault: true,
        isProtected: true,
      },
      {
        id: 'default-gerente-001',
        email: 'gerente@empresacorporativa.com',
        cpf: '33333333333',
        name: 'Gerente Corporativo',
        role: 'GERENTE',
        department: 'Atendimento',
        position: 'Supervisor de Atendimento',
        isActive: true,
        isDefault: true,
        isProtected: true,
      },
      {
        id: 'default-operador-001',
        email: 'operador@empresacorporativa.com',
        cpf: '44444444444',
        name: 'Operador Corporativo',
        role: 'OPERADOR',
        department: 'Atendimento',
        position: 'Atendente',
        isActive: true,
        isDefault: true,
        isProtected: true,
      },
    ];

    console.log('Inserindo usuários corporativos padrão...');

    for (const userData of defaultCorporateUsers) {
      // Verificar se o usuário já existe
      let existingUser = await prisma.corporateUser.findUnique({
        where: { cpf: userData.cpf },
      });

      if (!existingUser) {
        console.log(`Criando usuário: ${userData.name} (${userData.role})`);
        existingUser = await prisma.corporateUser.create({
          data: {
            ...userData,
            password: hashedPassword,
            tenantId: tenant.id,
          },
        });
        console.log(`✅ Usuário criado: ${existingUser.id}`);
      } else {
        console.log(
          `Usuário já existe: ${existingUser.name} (${existingUser.role})`,
        );
      }
    }

    console.log('\n🎉 Usuários corporativos padrão configurados com sucesso!');
    console.log('\n📋 Credenciais de acesso:');
    console.log('Email: admin@empresacorporativa.com');
    console.log('CPF: 11111111111');
    console.log('Senha: Corporativo@123');
    console.log('\n🔐 Role: ADMINISTRADOR (acesso total ao sistema)');
  } catch (error) {
    console.error('❌ Erro ao inserir usuários corporativos:', error);
  } finally {
    await prisma.$disconnect();
  }
}

insertCorporateUsers();
