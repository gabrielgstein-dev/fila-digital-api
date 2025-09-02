import { AppRouter } from './igniter.router';
import { createIgniterAppContext } from './igniter.context';

// Aplicação Igniter.js principal
export const app = AppRouter;

// Contexto da aplicação
export const context = createIgniterAppContext;

export default app;
