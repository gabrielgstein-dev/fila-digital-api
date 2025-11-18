# 🧪 Guia de Teste - Z-API

## ✅ Verificar Configuração

### 1. Verificar Status

```bash
curl http://localhost:3001/api/v1/whatsapp/status
```

**Resposta esperada:**
```json
{
  "configured": true,
  "message": "Z-API está configurado e pronto para uso"
}
```

Se retornar `configured: false`, verifique:
- ✅ Variáveis de ambiente estão configuradas
- ✅ Aplicação foi reiniciada após configurar as variáveis
- ✅ Nomes das variáveis estão corretos (case-sensitive)

## 🧪 Testar Envio de Mensagem com Botões

### Teste Básico

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "tenantName": "Empresa Teste",
    "ticketToken": "A001",
    "clientName": "João Silva",
    "queueName": "Atendimento Geral"
  }'
```

**Resposta esperada:**
```json
{
  "success": true,
  "messageSid": "D241XXXX732339502B68"
}
```

### Teste com Número Real

Substitua `5511999999999` pelo seu número de WhatsApp (formato: 55 + DDD + número, sem + e sem espaços).

Exemplo:
- Seu número: (11) 98765-4321
- Formato correto: `5511987654321`

## 📱 Verificar Mensagem Recebida

Após enviar o teste, você deve receber no WhatsApp:

```
Olá! João
Você entrou na fila Atendimento Geral da empresa Empresa Teste.

Sua senha é A001
Tempo médio de espera 5 minutos
Quantidade de senhas na sua frente 0
```

Com 2 botões:
- **Ver Status**
- **Falar com Suporte**

## 🔍 Troubleshooting

### Erro: "Z-API not configured"

**Solução:**
1. Verifique se as variáveis estão no `.env`:
   ```bash
   ZAPI_BASE_URL=https://api.z-api.io
   ZAPI_INSTANCE_ID=seu-instance-id
   ZAPI_INSTANCE_TOKEN=seu-instance-token
   ZAPI_ACCOUNT_TOKEN=seu-account-token
   ```

2. Reinicie a aplicação:
   ```bash
   # Se usando npm/pnpm
   pnpm run start:dev

   # Se usando Docker
   docker-compose restart
   ```

### Erro: "Instance not found"

**Solução:**
1. Verifique o `ZAPI_INSTANCE_ID` no painel do Z-API
2. Certifique-se de que a instância está **conectada** (status verde)
3. Verifique se copiou o ID completo

### Erro: "Invalid token"

**Solução:**
1. Verifique o `ZAPI_INSTANCE_TOKEN` no painel do Z-API
2. Verifique o `ZAPI_ACCOUNT_TOKEN` (se usado)
3. Gere novos tokens se necessário

### Mensagem não chega

**Possíveis causas:**
1. **Instância desconectada** - Reconecte no painel do Z-API
2. **Número em formato errado** - Use apenas números, sem + ou espaços
3. **WhatsApp bloqueado** - Verifique se o número está bloqueado
4. **Limite atingido** - Verifique seu plano no Z-API

**Solução:**
1. Verifique os logs da aplicação
2. Verifique o status da instância no painel Z-API
3. Teste via Swagger do Z-API (Central do Desenvolvedor)

## 📊 Logs da Aplicação

Para ver os logs em tempo real:

```bash
# Se usando npm/pnpm
# Os logs aparecerão no terminal

# Se usando Docker
docker logs -f fila-api
```

Procure por:
- ✅ `Z-API WhatsApp provider initialized` - Configuração OK
- ✅ `Sending WhatsApp button list via Z-API to...` - Enviando
- ✅ `WhatsApp button list sent successfully` - Sucesso
- ❌ `Z-API error` - Erro (verifique detalhes)

## 🎯 Teste no Fluxo Real

### Criar Ticket e Receber Mensagem

```bash
curl -X POST http://localhost:3001/api/v1/queues/{queueId}/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "clientName": "Maria Santos",
    "clientPhone": "5511987654321",
    "priority": 1
  }'
```

O cliente receberá automaticamente a mensagem com botões no WhatsApp.

## ✅ Checklist

- [ ] Variáveis de ambiente configuradas
- [ ] Aplicação reiniciada
- [ ] Status retorna `configured: true`
- [ ] Teste de envio retorna `success: true`
- [ ] Mensagem recebida no WhatsApp
- [ ] Botões aparecem na mensagem
- [ ] Clique nos botões funciona (se webhook configurado)

---

**Última atualização:** Janeiro 2025
