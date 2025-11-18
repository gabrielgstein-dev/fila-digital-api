# Variáveis de Ambiente para Deploy STAGE

## Variáveis do Z-API (WhatsApp)

```bash
ZAPI_BASE_URL_STAGE=https://api.z-api.io
ZAPI_INSTANCE_ID_STAGE=your-instance-id
ZAPI_INSTANCE_TOKEN_STAGE=your-instance-token
ZAPI_ACCOUNT_TOKEN_STAGE=your-account-token
```

## Rate Limiting WhatsApp (Anti-Spam)

```bash
WHATSAPP_MIN_DELAY_MS_STAGE=5000
```

**Valores recomendados:**

- Produção: `5000` (5 segundos)
- Staging: `3000` (3 segundos) - pode ser menor para testes
- Desenvolvimento: `1000` (1 segundo) - use com cuidado!

## Frontend URL (usado nas mensagens do WhatsApp)

```bash
FRONTEND_URL_STAGE=https://your-stage-frontend-url.com
```

## Resumo Completo

Todas as variáveis que precisam ser configuradas no deploy STAGE:

1. `ZAPI_BASE_URL_STAGE`
2. `ZAPI_INSTANCE_ID_STAGE`
3. `ZAPI_INSTANCE_TOKEN_STAGE`
4. `ZAPI_ACCOUNT_TOKEN_STAGE`
5. `WHATSAPP_MIN_DELAY_MS_STAGE`
6. `FRONTEND_URL_STAGE`

## Notas

- O `ZAPI_ACCOUNT_TOKEN_STAGE` pode ser opcional dependendo da configuração da sua instância Z-API
- O `FRONTEND_URL_STAGE` é usado para gerar links nas mensagens do WhatsApp
