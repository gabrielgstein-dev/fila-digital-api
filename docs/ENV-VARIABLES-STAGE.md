# Variáveis de Ambiente para Deploy STAGE

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

1. `WHATSAPP_MIN_DELAY_MS_STAGE`
2. `FRONTEND_URL_STAGE`

## Notas

- O `FRONTEND_URL_STAGE` é usado para gerar links nas mensagens do WhatsApp
