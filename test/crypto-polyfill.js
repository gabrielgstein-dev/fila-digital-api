// Polyfill para crypto no ambiente de testes
if (typeof global.crypto === 'undefined') {
  global.crypto = require('crypto');
}

// Garantir que o crypto.webcrypto também esteja disponível
if (typeof global.crypto?.webcrypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto.webcrypto = webcrypto;
}
