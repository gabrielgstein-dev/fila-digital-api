# Configuração Z-API para WhatsApp

## 🎯 Por que Z-API?

Z-API é uma solução brasileira para envio de mensagens WhatsApp com:

- ✅ **Empresa brasileira** (suporte em português)
- ✅ **Preços em reais**
- ✅ **Facilidade de integração**
- ✅ **Suporte local**
- ✅ **Conformidade com LGPD**
- ✅ **API REST simples**

## 📋 Pré-requisitos

1. Conta no Z-API (https://www.z-api.io/)
2. Instância criada no Z-API
3. Credenciais (Instance ID, Instance Token, Account Token)

## 🚀 Configuração

### 1. Criar Conta no Z-API

1. Acesse: https://www.z-api.io/
2. Crie uma conta
3. Faça login no painel

### 2. Criar Instância

1. No painel do Z-API, vá em **Instâncias Web**
2. Clique em **Criar Nova Instância**
3. Escaneie o QR Code com seu WhatsApp
4. Aguarde a conexão ser estabelecida

### 3. Obter Credenciais

Após criar a instância, você precisará de:

1. **Instance ID**: ID da instância criada
2. **Instance Token**: Token da instância (encontrado na aba da instância)
3. **Account Token**: Token de segurança da conta (encontrado em Segurança)

### 4. Configurar Variáveis de Ambiente

Adicione no seu `.env`:

```bash
# Z-API Configuration
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=seu-instance-id
ZAPI_INSTANCE_TOKEN=seu-instance-token
ZAPI_ACCOUNT_TOKEN=seu-account-token
```

### 5. Testar Configuração

Use o endpoint de teste:

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "tenantName": "Empresa Teste",
    "ticketToken": "A001"
  }'
```

## 📚 Documentação

- **Site oficial:** https://www.z-api.io/
- **Documentação da API:** https://developer.z-api.io/
- **Central do Desenvolvedor:** https://www.z-api.io/central-do-desenvolvedor/
- **Swagger (testes):** Disponível na central do desenvolvedor

## 🔧 Endpoint da API

O Z-API usa o seguinte formato de endpoint:

```
POST https://api.z-api.io/instances/{instanceId}/token/{instanceToken}/send-text
```

Com headers:
- `Content-Type: application/json`
- `Client-Token: {accountToken}` (opcional, mas recomendado)

Body:
```json
{
  "phone": "5511999999999",
  "message": "Sua mensagem aqui"
}
```

## 💰 Preços

Consulte os preços atualizados em: https://www.z-api.io/

Geralmente:
- ~R$ 0,05 - R$ 0,10 por mensagem
- Planos mensais disponíveis
- Sem custos de setup

## 🔒 Segurança

1. ✅ **Nunca commite** as credenciais no Git
2. ✅ Use **variáveis de ambiente** ou **secrets**
3. ✅ Mantenha o **Account Token** seguro
4. ✅ Use **HTTPS** em produção

## 🛠️ Troubleshooting

### Erro: "Z-API not configured"

Verifique se as variáveis estão configuradas:
- `ZAPI_INSTANCE_ID`
- `ZAPI_INSTANCE_TOKEN`
- `ZAPI_ACCOUNT_TOKEN` (opcional, mas recomendado)

### Erro: "Instance not found"

- Verifique se o `ZAPI_INSTANCE_ID` está correto
- Verifique se a instância está ativa no painel do Z-API

### Erro: "Invalid token"

- Verifique se o `ZAPI_INSTANCE_TOKEN` está correto
- Verifique se o `ZAPI_ACCOUNT_TOKEN` está correto (se usado)

### Mensagens não sendo enviadas

1. Verifique se a instância está conectada no painel do Z-API
2. Verifique se o número de telefone está no formato correto (sem +, apenas números)
3. Verifique os logs da aplicação para mais detalhes

## 📝 Exemplo de Uso

```typescript
// O WhatsAppService já está configurado para usar Z-API
// Apenas configure as variáveis de ambiente e use:

await whatsappService.sendQueueNotification(
  '5511999999999',
  'Empresa XYZ',
  'A001',
  1, // position
  5, // estimatedMinutes
  'ticket-id',
  'https://app.fila-digital.com'
);
```

---

**Última atualização:** Janeiro 2025
