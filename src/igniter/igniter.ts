import { Igniter } from '@igniter-js/core';
import type { IgniterAppContext } from './igniter.context';

// Inicialização do builder do Igniter com contexto tipado
export const igniter = Igniter.context<IgniterAppContext>().create();
