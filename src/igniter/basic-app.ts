import { Igniter } from '@igniter-js/core';

// Aplicação básica do Igniter.js
const app = Igniter.create()
  .controller({
    path: '/auth',
    actions: {
      login: Igniter.query({
        handler: async () => {
          return { message: 'Login endpoint' };
        },
      }),
    },
  })
  .controller({
    path: '/tenants',
    actions: {
      list: Igniter.query({
        handler: async () => {
          return { message: 'List tenants endpoint' };
        },
      }),
    },
  });

export default app;
