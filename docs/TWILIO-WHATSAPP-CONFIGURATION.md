# Configuração WhatsApp com Twilio

Este documento explica como configurar o envio automático de mensagens WhatsApp via Twilio no projeto Fila API.

## 📋 Pré-requisitos

1. Conta no Twilio (https://www.twilio.com/)
2. Número de telefone verificado no Twilio
3. WhatsApp Business API ativada (ou usar Sandbox para testes)

## 🔧 Configuração Passo a Passo

### 1. Criar Conta no Twilio

1. Acesse https://www.twilio.com/
2. Crie uma conta gratuita
3. Verifique seu número de telefone
4. Anote seu **Account SID** e **Auth Token** (disponíveis no dashboard)

### 2. Configurar WhatsApp no Twilio

#### Opção A: Sandbox (Gratuito para Testes) ⭐ RECOMENDADO PARA COMEÇAR

1. No dashboard do Twilio, vá em **Messaging** > **Try it out** > **Send a WhatsApp message**
2. Você receberá um número sandbox: `whatsapp:+14155238886`
3. Para testar, envie uma mensagem para este número com o código fornecido
4. Após enviar, você poderá receber mensagens deste número

**Limitações do Sandbox:**
- Apenas números verificados podem receber mensagens
- Precisa enviar mensagem primeiro para o sandbox
- Ideal para desenvolvimento e testes

#### Opção B: WhatsApp Business API (Produção)

1. No dashboard do Twilio, vá em **Messaging** > **Settings** > **WhatsApp Senders**
2. Solicite um número WhatsApp Business
3. Complete o processo de verificação
4. Após aprovação, você receberá um número no formato `whatsapp:+1234567890`

**Vantagens:**
- Funciona com qualquer número (não precisa verificar antes)
- Pronto para produção
- 1.000 conversas grátis por mês

### 3. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Twilio Configuration
TWILIO_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_TOKEN=your_auth_token_here
TWILIO_FROM_NUMBER=+1234567890
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Para Sandbox (Testes):**
```bash
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

**Para Produção:**
```bash
TWILIO_WHATSAPP_NUMBER=whatsapp:+1234567890
```

### 4. Formato dos Números

**Importante:** O número deve sempre começar com `whatsapp:` quando for WhatsApp.

- ✅ Correto: `whatsapp:+5511999999999`
- ❌ Incorreto: `+5511999999999`

O sistema automaticamente adiciona o prefixo `whatsapp:` se não estiver presente.

## 🧪 Testando a Configuração

### 1. Verificar se o Serviço Está Configurado

O serviço verifica automaticamente se as credenciais estão configuradas. Você verá no log:

```
[WhatsAppService] Twilio WhatsApp service initialized
```

Se não estiver configurado:
```
[WhatsAppService] Twilio credentials not found. WhatsApp link generation will still work, but automatic sending will be disabled.
```

### 2. Testar Envio Manual

Use o endpoint de teste:

```bash
POST /api/v1/whatsapp/send
Authorization: Bearer {token}

{
  "phoneNumber": "+5511999999999",
  "message": "Teste de mensagem WhatsApp"
}
```

### 3. Testar Fluxo Completo

Crie um ticket normalmente:

```bash
POST /api/v1/queues/{queueId}/tickets

{
  "clientName": "João Silva",
  "clientPhone": "+5511999999999",
  "clientCpf": "12345678900"
}
```

O sistema automaticamente enviará uma mensagem WhatsApp com:
> "Olá! Você entrou na fila da empresa [Nome da Empresa] e sua senha é [Senha]. Aguarde ser chamado."

## 📱 Formato das Mensagens

### Notificação de Entrada na Fila

Quando um cliente cria um ticket, recebe automaticamente:

```
Olá! Você entrou na fila da empresa [Nome da Empresa] e sua senha é [Senha]. Aguarde ser chamado.
```

## ⚠️ Troubleshooting

### Erro: "WhatsApp automatic sending not available"

**Causa:** Twilio não está configurado ou credenciais inválidas.

**Solução:**
1. Verifique se `TWILIO_SID` e `TWILIO_TOKEN` estão corretos
2. Verifique se `TWILIO_WHATSAPP_NUMBER` está no formato correto (`whatsapp:+...`)
3. Reinicie o servidor após adicionar as variáveis

### Erro: "No sender WhatsApp number configured"

**Causa:** `TWILIO_WHATSAPP_NUMBER` não está configurado.

**Solução:**
1. Adicione `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886` (sandbox) ou seu número de produção
2. Reinicie o servidor

### Mensagem não chega (Sandbox)

**Causa:** Número não foi verificado no sandbox.

**Solução:**
1. Envie uma mensagem primeiro para `whatsapp:+14155238886` com o código fornecido
2. Após verificar, você poderá receber mensagens

### Mensagem não chega (Produção)

**Causa:** Número não está aprovado ou WhatsApp Business API não está ativa.

**Solução:**
1. Verifique o status do número no dashboard do Twilio
2. Certifique-se de que o processo de verificação foi concluído
3. Verifique se há créditos na conta Twilio

## 💰 Custos

### Sandbox
- ✅ **Gratuito** para testes
- Limitações: apenas números verificados

### Produção
- ✅ **1.000 conversas grátis por mês**
- Depois: ~US$ 0,005 por mensagem (Brasil)
- ~R$ 0,025 por mensagem

## 📊 Monitoramento

### Verificar Logs

O serviço registra todas as tentativas de envio:

```
[WhatsAppService] Sending WhatsApp to whatsapp:+5511999999999: Olá! Você entrou...
[WhatsAppService] WhatsApp sent successfully. Message SID: SMxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Dashboard Twilio

Acesse o dashboard do Twilio para:
- Ver histórico de mensagens enviadas
- Verificar status de entrega
- Monitorar custos
- Ver logs de erros

## ✅ Checklist de Configuração

- [ ] Conta Twilio criada
- [ ] Account SID e Auth Token anotados
- [ ] WhatsApp Sandbox ou Business API configurado
- [ ] Número WhatsApp obtido (formato `whatsapp:+...`)
- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Servidor reiniciado
- [ ] Teste de envio realizado
- [ ] Mensagem recebida com sucesso

## 🚀 Próximos Passos

Após configurar:

1. ✅ Teste com o endpoint de teste
2. ✅ Crie um ticket e verifique se a mensagem chega
3. ✅ Monitore os logs para garantir que está funcionando
4. ✅ Configure alertas no Twilio para erros

---

**Última atualização:** Janeiro 2025
**Status:** Pronto para uso ✅
