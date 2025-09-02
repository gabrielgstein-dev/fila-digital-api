import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

// Instância do Prisma para o contexto
export const database = new PrismaService();

// Função para criar o contexto da aplicação Igniter.js
export const createIgniterAppContext = () => {
  return {
    database,
  };
};

// Tipo do contexto da aplicação
export type IgniterAppContext = ReturnType<typeof createIgniterAppContext>;
