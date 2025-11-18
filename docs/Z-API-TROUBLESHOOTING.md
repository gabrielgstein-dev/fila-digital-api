# 🔧 Troubleshooting Z-API - Mensagem não chega

## 🚨 Problema: API retorna sucesso mas mensagem não chega

Se você vê nos logs:
```
WhatsApp button list sent successfully via Z-API. Message ID: 91EE4736FB4E785B01B0
```

Mas a mensagem não chega no WhatsApp, siga este guia de diagnóstico.

## 🔍 Diagnóstico Passo a Passo

### 1. Verificar Status da Instância no Z-API

1. Acesse o painel do Z-API: https://www.z-api.io/
2. Vá em **"Instâncias Web"**
3. Verifique o status da sua instância:
   - 🟢 **Conectado** - Tudo OK
   - 🟡 **Conectando** - Aguardando conexão
   - 🔴 **Desconectado** - Precisa reconectar

**Se estiver desconectado:**
- Clique em **"Reconectar"** ou **"Pegar QR Code"**
- Escaneie o QR Code novamente com seu WhatsApp

### 2. Verificar Formato do Número

O número `556182172963` parece estar correto (55 + DDD + número).

**Verifique:**
- ✅ Número está no formato: `55` + `DDD` + `número` (sem +, sem espaços)
- ✅ DDD está correto (61 = Brasília)
- ✅ Número completo tem 13 dígitos (55 + 2 + 9 ou 10)

**Teste com número conhecido:**
```bash
# Use seu próprio número para testar
curl -X POST http://localhost:3001/api/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "tenantName": "Teste",
    "ticketToken": "A001",
    "clientName": "Teste",
    "queueName": "Teste"
  }'
```

### 3. Verificar Logs Detalhados

Com as melhorias implementadas, você verá logs mais detalhados:

```
DEBUG [ZApiProvider] Z-API request body: {
  "phone": "556182172963",
  "message": "...",
  "buttonList": {
    "buttons": [...]
  }
}
DEBUG [ZApiProvider] Z-API response status: 200, body: {...}
```

**Procure por:**
- ❌ Erros na resposta do Z-API
- ❌ Status diferente de 200
- ❌ Mensagens de erro no body da resposta

### 4. Verificar no Painel do Z-API

1. Acesse o painel do Z-API
2. Vá em **"Mensagens"** ou **"Histórico"**
3. Verifique se a mensagem aparece lá:
   - Se aparecer como **"Enviada"** mas não chegou → Problema com o número
   - Se aparecer como **"Falhou"** → Veja o motivo do erro
   - Se não aparecer → Problema na requisição

### 5. Testar Diretamente no Z-API

Use o Swagger do Z-API para testar:

1. Acesse: https://www.z-api.io/central-do-desenvolvedor/
2. Faça login
3. Use o Swagger para testar o endpoint `/send-button-list`
4. Compare com o que sua aplicação está enviando

### 6. Verificar Webhooks (se configurado)

Se você configurou webhooks, verifique:
- Status da mensagem (enviada, entregue, lida, falhou)
- Erros específicos retornados pelo Z-API

## 🛠️ Soluções Comuns

### Problema: Instância Desconectada

**Solução:**
1. Reconecte a instância no painel do Z-API
2. Escaneie o QR Code novamente
3. Aguarde status mudar para "Conectado"

### Problema: Número Bloqueado

**Solução:**
1. Verifique se o número não está bloqueado no WhatsApp
2. Tente enviar de outro número
3. Verifique se o número tem WhatsApp ativo

### Problema: Formato do Número Incorreto

**Solução:**
- Use apenas números, sem +, sem espaços, sem parênteses
- Formato: `55` + `DDD` + `número`
- Exemplo: `5511987654321` (correto)
- Exemplo: `+55 11 98765-4321` (incorreto)

### Problema: Limite de Mensagens

**Solução:**
1. Verifique seu plano no Z-API
2. Verifique se não atingiu o limite diário/mensal
3. Aguarde ou faça upgrade do plano

### Problema: Botões não suportados

**Solução:**
- Verifique se a instância suporta botões
- Alguns números podem ter restrições
- Tente enviar mensagem simples primeiro (sem botões)

## 📊 Verificar Status da Mensagem

Após enviar, você pode verificar o status usando o ID retornado:

```bash
# O messageId retornado pode ser usado para verificar status
# No painel do Z-API, procure pela mensagem pelo ID
```

## 🔄 Teste Alternativo: Mensagem Simples

Teste primeiro com mensagem simples (sem botões) para isolar o problema:

```typescript
// Temporariamente, use sendWhatsApp ao invés de sendButtonList
await this.zapiProvider.sendMessage({
  to: phoneNumber,
  message: 'Teste simples sem botões'
});
```

Se a mensagem simples chegar, o problema pode ser com os botões.

## 📝 Checklist de Diagnóstico

- [ ] Instância está conectada (status verde)
- [ ] Número está no formato correto (55 + DDD + número)
- [ ] Número tem WhatsApp ativo
- [ ] Não atingiu limite de mensagens
- [ ] Logs mostram requisição sendo enviada
- [ ] Logs mostram resposta 200 do Z-API
- [ ] Mensagem aparece no histórico do Z-API
- [ ] Testou com número conhecido (seu próprio)
- [ ] Testou mensagem simples (sem botões)

## 🆘 Se Nada Funcionar

1. **Entre em contato com suporte Z-API:**
   - Via painel do Z-API
   - Informe o Message ID: `91EE4736FB4E785B01B0`
   - Informe o número de destino
   - Informe o status da instância

2. **Verifique documentação oficial:**
   - https://developer.z-api.io/
   - Tópico: "Funcionamento dos Botões"

3. **Teste via Swagger:**
   - Use o Swagger do Z-API para comparar
   - Veja se há diferenças na requisição

---

**Última atualização:** Janeiro 2025
