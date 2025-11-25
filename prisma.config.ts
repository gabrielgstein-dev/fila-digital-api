const config = {
  schemaPath: './prisma/schema.prisma',
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
};

export default config;
