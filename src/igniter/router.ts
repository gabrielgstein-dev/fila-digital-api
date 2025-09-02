import { Igniter } from '@igniter-js/core';
import { createBackofficeContext } from './context';
import { dashboardController } from './controllers/dashboard.controller';

export const igniter = Igniter.context<BackofficeContext>().create();

export const BackofficeRouter = igniter.router({
  baseURL: process.env.IGNITER_BASE_URL || 'http://localhost:3001',
  basePATH: '/api/igniter',
  controllers: {
    dashboard: dashboardController,
  },
});

export type BackofficeRouter = typeof BackofficeRouter;
