import { PrismaService } from '../src/prisma/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  try {
    // Limpar todas as tabelas na ordem correta (respeitando foreign keys)
    await prisma.callLog.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.queue.deleteMany();
    await prisma.counter.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.corporateUser.deleteMany();
    await prisma.user.deleteMany();
    await prisma.tenant.deleteMany();

    console.log('✅ Banco de dados limpo com sucesso usando deleteMany');
  } catch (error) {
    console.error('❌ Erro ao limpar banco com deleteMany:', error);

    // Fallback para TRUNCATE CASCADE se deleteMany falhar
    try {
      const tablenames = await prisma.$queryRaw<Array<{ tablename: string }>>`
        SELECT tablename FROM pg_tables WHERE schemaname='public'
      `;

      const tables = tablenames
        .map(({ tablename }) => tablename)
        .filter((name) => name !== '_prisma_migrations')
        .map((name) => `"public"."${name}"`)
        .join(', ');

      if (tables) {
        await prisma.$executeRawUnsafe(
          `TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE;`,
        );
        console.log(
          '✅ Banco de dados limpo com sucesso usando TRUNCATE CASCADE',
        );
      }
    } catch (truncateError) {
      console.error('❌ Erro ao executar TRUNCATE CASCADE:', truncateError);
      throw new Error(
        'Falha ao limpar banco de dados: ambos os métodos falharam',
      );
    }
  }
}

export async function setupTestDatabase(prisma: PrismaService): Promise<void> {
  await cleanDatabase(prisma);
}

export async function teardownTestDatabase(
  prisma: PrismaService,
): Promise<void> {
  await cleanDatabase(prisma);
  await prisma.$disconnect();
}
