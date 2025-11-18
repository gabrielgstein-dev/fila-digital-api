# Configuração do Bot Telegram

Este documento explica como configurar e usar o bot do Telegram para permitir que usuários peguem tickets e acompanhem seus chamados.

## 📋 Pré-requisitos

1. Conta no Telegram
2. Acesso ao BotFather no Telegram (@BotFather)

## 🔧 Configuração Inicial

### 1. Criar o Bot no Telegram

1. Abra o Telegram e procure por `@BotFather`
2. Envie o comando `/newbot`
3. Siga as instruções para criar seu bot:
   - Escolha um nome para o bot
   - Escolha um username (deve terminar com `bot`)
4. O BotFather retornará um **token** (ex: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)
5. Copie este token

### 2. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis no seu arquivo `.env`:

```env
TELEGRAM_BOT_TOKEN=seu-token-aqui
TELEGRAM_BOT_USERNAME=seu_bot_username
TELEGRAM_WEBHOOK_URL=https://seu-dominio.com/telegram/webhook
```

**Nota:**
- O `TELEGRAM_BOT_USERNAME` é o username do bot (sem o @). Exemplo: se o bot é `@meu_bot`, use `meu_bot`.
- O `TELEGRAM_WEBHOOK_URL` é opcional. Se não for fornecido, o bot usará polling (recomendado para desenvolvimento).

### 3. Aplicar Migração do Banco de Dados

Execute a migração para adicionar o campo `telegramChatId` na tabela `tickets`:

```sql
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS "telegramChatId" TEXT;
```

Ou usando Prisma:

```bash
pnpm prisma migrate dev --name add_telegram_chat_id
```

## 🚀 Funcionalidades do Bot

### Comandos Disponíveis

- `/start` - Inicia o bot e mostra mensagem de boas-vindas
- `/start queue_<queueId>` - Entra automaticamente na fila especificada (usado via QR Code)
- `/pegar_ticket` - Lista filas disponíveis e permite pegar um ticket
- `/status` - Mostra o status do ticket atual do usuário
- `/ajuda` - Mostra informações de ajuda

### Fluxo de Uso

#### **Opção 1: Via QR Code (Recomendado)**

1. **Cliente escaneia o QR Code:**
   - O QR Code contém um link do Telegram: `https://t.me/seu_bot?start=queue_<queueId>`
   - Quando o cliente clica no link, o Telegram abre o bot automaticamente
   - O bot detecta o parâmetro `queue_<queueId>` e cria o ticket automaticamente
   - O cliente recebe imediatamente uma mensagem com:
     - ✅ Confirmação de entrada na fila
     - 📋 Número da senha
     - 📊 Posição na fila
     - ⏰ Tempo estimado de espera

2. **Notificações Automáticas:**
   - Quando o ticket for chamado, o cliente recebe uma notificação automática
   - A notificação inclui o número da senha e instruções para se dirigir ao atendimento

#### **Opção 2: Via Comandos Manuais**

1. **Pegar Ticket:**
   - Usuário envia `/pegar_ticket`
   - Bot lista todas as filas ativas
   - Usuário seleciona uma fila
   - Bot cria o ticket e informa:
     - Número da senha
     - Posição na fila
     - Tempo estimado de espera

2. **Acompanhar Status:**
   - Usuário envia `/status`
   - Bot mostra:
     - Número da senha
     - Fila
     - Status atual
     - Posição na fila
     - Tempo estimado

## 🔄 Modo de Operação

### Polling (Padrão para Desenvolvimento)

Se `TELEGRAM_WEBHOOK_URL` não estiver configurado, o bot usa polling:
- O bot consulta o Telegram periodicamente por novas mensagens
- Funciona bem para desenvolvimento e testes
- Não requer configuração de webhook

### Webhook (Recomendado para Produção)

Se `TELEGRAM_WEBHOOK_URL` estiver configurado:
- O Telegram envia atualizações diretamente para o endpoint
- Mais eficiente para produção
- Requer HTTPS e certificado SSL válido

Para configurar o webhook manualmente:

```bash
curl -X POST "https://api.telegram.org/bot<SEU_TOKEN>/setWebhook" \
  -d "url=https://seu-dominio.com/telegram/webhook"
```

## 🧪 Testando o Bot

### Teste Básico

1. Procure pelo seu bot no Telegram usando o username que você criou
2. Envie `/start` para iniciar
3. Teste os comandos:
   - `/pegar_ticket` - Verifique se as filas aparecem
   - Crie um ticket selecionando uma fila
   - Use `/status` para verificar o status
4. No painel administrativo, chame o próximo ticket
5. Verifique se a notificação foi recebida no Telegram

### Teste do QR Code

1. Gere um QR Code para uma fila usando: `GET /api/v1/queues/:queueId/qrcode`
2. A resposta incluirá um campo `telegramDeepLink` com o link do Telegram
3. Abra o link no navegador ou escaneie um QR Code que contenha esse link
4. O Telegram deve abrir automaticamente e criar o ticket
5. Verifique se a mensagem de confirmação foi recebida

**Exemplo de QR Code gerado:**
```json
{
  "queueId": "clq123...",
  "queueName": "Atendimento Geral",
  "telegramDeepLink": "https://t.me/seu_bot?start=queue_clq123...",
  "qrCodeUrl": "...",
  "directUrl": "http://localhost:3000/queue/clq123..."
}
```

## 📝 Notas Importantes

- O bot armazena o `chatId` do Telegram no campo `telegramChatId` do ticket
- Cada usuário pode ter apenas um ticket ativo por vez (status WAITING ou CALLED)
- As notificações são enviadas automaticamente quando:
  - Um ticket é criado (confirmação)
  - Um ticket é chamado (notificação de chamada)
- O bot funciona de forma independente do SMS, mas ambos podem ser usados simultaneamente

## 🔐 Segurança

- O token do bot deve ser mantido em segredo
- Use variáveis de ambiente, nunca commite o token no código
- Para produção, use HTTPS obrigatoriamente
- Considere implementar rate limiting para evitar spam

## 🐛 Troubleshooting

### Bot não responde

- Verifique se `TELEGRAM_BOT_TOKEN` está configurado corretamente
- Verifique os logs da aplicação para erros
- Certifique-se de que o bot está ativo no BotFather

### Webhook não funciona

- Verifique se a URL está acessível publicamente
- Certifique-se de que está usando HTTPS
- Verifique se o certificado SSL é válido
- Use o endpoint `/telegram/webhook` para receber atualizações

### Notificações não são enviadas

- Verifique se o campo `telegramChatId` foi salvo no ticket
- Verifique os logs para erros ao enviar mensagens
- Certifique-se de que o bot não foi bloqueado pelo usuário

## 📚 Próximos Passos

Após testar com Telegram, você pode migrar para Twilio seguindo o mesmo padrão de integração.
