import { PrismaService } from '../src/prisma/prisma.service';

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  // Usar deleteMany em ordem específica para evitar deadlocks
  try {
    await prisma.callLog.deleteMany();
    await prisma.ticket.deleteMany();
    await prisma.queue.deleteMany();
    await prisma.counter.deleteMany();
    await prisma.agent.deleteMany();
    await prisma.tenant.deleteMany();
  } catch (error) {
    console.error('Erro ao limpar banco com deleteMany:', error);
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
      }
    } catch (truncateError) {
      console.error('Erro ao executar TRUNCATE CASCADE:', truncateError);
      throw truncateError;
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
