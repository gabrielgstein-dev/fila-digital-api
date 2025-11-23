# Template WhatsApp queue_info - Configuração em Português

Este documento descreve como criar e configurar o template `queue_info` no Meta Business Manager em português (PT-BR).

## 📋 Informações do Template

- **Nome:** `queue_info`
- **Idioma:** Português (pt_BR)
- **Tipo:** Template de mensagem (Message Template)
- **Categoria:** UTILITY

## 📝 Estrutura do Template

O template `queue_info` recebe **4 parâmetros** na seguinte ordem:

1. **Parâmetro 1:** Nome da fila (ex: "Atendimento Geral")
2. **Parâmetro 2:** Senha/Token do ticket (ex: "A123")
3. **Parâmetro 3:** Tempo de espera estimado (ex: "15 minutos")
4. **Parâmetro 4:** Número de pessoas na frente (ex: "2")

## ✅ Texto do Template em Português

Use o seguinte texto ao criar o template no Meta Business Manager:

```text
Olá! Você entrou na fila {{1}}.

🎫 Sua senha: {{2}}
⏱️ Tempo médio de espera: {{3}}
📊 Senhas na sua frente: {{4}}

Aguarde ser chamado!
```

### Versão sem emojis (caso necessário)

```text
Olá! Você entrou na fila {{1}}.

Sua senha: {{2}}
Tempo médio de espera: {{3}}
Senhas na sua frente: {{4}}

Aguarde ser chamado!
```

## 🔧 Como Criar no Meta Business Manager

### Passo a Passo

1. **Acesse o Meta Business Manager**
   - Vá para: <https://business.facebook.com/>
   - Acesse sua conta do WhatsApp Business

2. **Navegue para Templates**
   - Clique em **WhatsApp Manager** (ou **WhatsApp** no painel do app)
   - No menu lateral, clique em **Templates de mensagem**
   - Clique em **Criar modelo** (ou **Create Message Template**)

3. **Configure o Template**
   - **Nome:** `queue_info`
   - **Categoria:** Selecione **UTILITY**
   - **Idioma:** Selecione **Português (pt_BR)**

4. **Adicione o Conteúdo**
   - Em **Conteúdo**, cole o texto do template acima
   - Certifique-se de usar os placeholders `{{1}}`, `{{2}}`, `{{3}}`, `{{4}}` na ordem correta

5. **Revise e Submeta**
   - Revise o template para garantir que está correto
   - Clique em **Submeter para revisão** (ou **Submit for Review**)

6. **Aguarde Aprovação**
   - A aprovação da Meta pode levar algumas horas ou até 24 horas
   - Você receberá notificação quando o template for aprovado

## 📌 Exemplo de Mensagem Enviada

Com os seguintes parâmetros:

- Fila: "Atendimento Geral"
- Senha: "A123"
- Tempo: "15 minutos"
- Pessoas na frente: "2"
- Fila: "Atendimento Geral"
- Senha: "A123"
- Tempo: "15 minutos"
- Pessoas na frente: "2"

A mensagem será:

```
Olá! Você entrou na fila Atendimento Geral.

🎫 Sua senha: A123
⏱️ Tempo médio de espera: 15 minutos
📊 Senhas na sua frente: 2

Aguarde ser chamado!
```

## 🔍 Verificação do Template

Após a aprovação, você pode verificar se o template está funcionando usando o endpoint de teste:

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test-template \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "templateName": "queue_info",
    "language": "pt_BR",
    "parameters": [
      { "type": "text", "text": "Atendimento Geral" },
      { "type": "text", "text": "A123" },
      { "type": "text", "text": "15 minutos" },
      { "type": "text", "text": "2" }
    ]
  }'
```

## ⚠️ Notas Importantes

1. **Ordem dos Parâmetros:** A ordem dos parâmetros deve ser exatamente: Nome da fila, Senha, Tempo, Pessoas na frente
2. **Idioma:** O template deve ser criado com idioma `pt_BR` (Português do Brasil)
3. **Aprovação:** O template precisa estar aprovado antes de poder ser usado
4. **Formato dos Parâmetros:** No código, os parâmetros são enviados como strings de texto
5. **Emojis:** Se a Meta rejeitar o template com emojis, use a versão sem emojis

## 🐛 Problemas Comuns

### Template não encontrado

- Verifique se o nome do template está exatamente como `queue_info`
- Confirme que o template foi aprovado e está ativo

### Idioma incorreto

- Certifique-se de que o template foi criado com idioma `pt_BR`
- No código, o language está configurado como `'pt_BR'`

### Erro de parâmetros

- Verifique se todos os 4 parâmetros estão sendo enviados
- Confirme que a ordem dos parâmetros está correta

## 📚 Referências

- [Documentação Oficial Meta - Criar Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)
- [Guia de Configuração WhatsApp Meta API](./WHATSAPP-META-API-CONFIGURATION.md)
- [Endpoint de Teste de Templates](./WHATSAPP-TEST-TEMPLATE-ENDPOINT.md)

---

**Data de Criação:** Janeiro 2025
**Versão:** 1.0

