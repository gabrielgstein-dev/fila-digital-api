# Z-API Provider Module

## 📁 Estrutura

Este módulo contém toda a implementação relacionada ao Z-API para envio de mensagens WhatsApp.

```text
zapi/
├── zapi.module.ts                # Módulo NestJS do Z-API
├── zapi.provider.ts              # Implementação do provider
├── whatsapp-provider.interface.ts  # Interfaces compartilhadas
└── README.md                     # Esta documentação
```

## 🎯 Responsabilidades

- ✅ Comunicação com Z-API
- ✅ Formatação de números de telefone
- ✅ Envio de mensagens WhatsApp
- ✅ Tratamento de erros
- ✅ Validação de configuração

## 🔧 Configuração

Variáveis de ambiente necessárias:

```bash
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=your-instance-id
ZAPI_INSTANCE_TOKEN=your-instance-token
ZAPI_ACCOUNT_TOKEN=your-account-token
```

## 📚 Uso

Este módulo é importado pelo `WhatsAppModule` e usado pelo `WhatsAppService`.

**Não use diretamente!** Use sempre através do `WhatsAppService`.

## 🔄 Modificações

Se precisar modificar a implementação do Z-API:

1. Edite `zapi.provider.ts`
2. Teste as mudanças
3. Atualize esta documentação se necessário

## 📖 Documentação Externa

- [Guia de Configuração](../../../../docs/Z-API-SETUP.md)
- [Documentação Oficial](https://developer.z-api.io/)
- [Site Z-API](https://www.z-api.io/)
