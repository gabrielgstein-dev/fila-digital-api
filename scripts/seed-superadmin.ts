import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPERADMIN_EMAIL || 'admin@agilizafilas.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'AgilizaFilas@2025!';
  const name = process.env.SUPERADMIN_NAME || 'Super Admin';

  const existing = await prisma.superAdmin.findUnique({ where: { email } });

  if (existing) {
    console.log(`SuperAdmin já existe: ${email}`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const superAdmin = await prisma.superAdmin.create({
    data: {
      email,
      name,
      password: hashedPassword,
      isActive: true,
    },
  });

  console.log(`SuperAdmin criado com sucesso!`);
  console.log(`  ID: ${superAdmin.id}`);
  console.log(`  Email: ${superAdmin.email}`);
  console.log(`  Nome: ${superAdmin.name}`);
  console.log(`  Senha: ${password}`);
  console.log(`\n⚠️  TROQUE A SENHA APÓS O PRIMEIRO LOGIN!`);
}

main()
  .catch((e) => {
    console.error('Erro ao criar SuperAdmin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
