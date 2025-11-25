/** @type {import('prisma').PrismaConfig} */
const config = {
  schemaPath: './prisma/schema.prisma',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
}

module.exports = config;
