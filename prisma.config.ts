import type { PrismaConfig } from '@prisma/client';

const config: PrismaConfig = {
  schemaPath: './prisma/schema.prisma',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

export default config;
