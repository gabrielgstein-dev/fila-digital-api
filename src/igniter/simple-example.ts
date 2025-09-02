import { Igniter } from '@igniter-js/core';

// Exemplo simples para entender a API
const app = Igniter.create().controller({
  path: '/test',
  actions: {
    hello: Igniter.query({
      handler: async () => {
        return { message: 'Hello from Igniter.js!' };
      },
    }),
  },
});

export default app;
