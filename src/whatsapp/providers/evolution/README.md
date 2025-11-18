# Evolution API Provider Module

## 📁 Estrutura

Este módulo contém toda a implementação relacionada ao Evolution API para envio de mensagens WhatsApp.

```text
evolution/
├── evolution.module.ts          # Módulo NestJS do Evolution API
├── evolution.provider.ts       # Implementação do provider
├── whatsapp-provider.interface.ts  # Interfaces compartilhadas
└── README.md                    # Esta documentação
```

## 🎯 Responsabilidades

- ✅ Comunicação com Evolution API
- ✅ Formatação de números de telefone
- ✅ Envio de mensagens WhatsApp
- ✅ Tratamento de erros
- ✅ Validação de configuração

## 🔧 Configuração

Variáveis de ambiente necessárias:

```bash
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=your-evolution-api-key
EVOLUTION_INSTANCE_NAME=default
```

## 📚 Uso

Este módulo é importado pelo `WhatsAppModule` e usado pelo `WhatsAppService`.

**Não use diretamente!** Use sempre através do `WhatsAppService`.

## 🔄 Modificações

Se precisar modificar a implementação do Evolution API:

1. Edite `evolution.provider.ts`
2. Teste as mudanças
3. Atualize esta documentação se necessário

## 📖 Documentação Externa

- [Guia de Instalação](../../../../docs/EVOLUTION-API-SETUP.md)
- [Deploy no GCP](../../../../docs/EVOLUTION-API-GCP-DEPLOY.md)
- [Documentação Oficial](https://evolution-api.com/)
