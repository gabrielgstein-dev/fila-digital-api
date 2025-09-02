import { igniter } from './igniter';
import { authController } from './controllers/auth.controller';

// Router principal da aplicação
export const AppRouter = igniter.router({
  baseURL: process.env.APP_URL || 'http://localhost:8080',
  basePATH: '/api/v1',
  controllers: {
    auth: authController,
  },
});

export type AppRouter = typeof AppRouter;
