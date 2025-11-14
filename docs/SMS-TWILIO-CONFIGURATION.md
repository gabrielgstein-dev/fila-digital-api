# Configuração SMS com Twilio

Este documento explica como configurar e usar o sistema de SMS integrado com Twilio no projeto Fila API.

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Twilio Configuration
TWILIO_SID=your_twilio_account_sid_here
TWILIO_TOKEN=your_twilio_auth_token_here
TWILIO_FROM_NUMBER=+1234567890  # Número do Twilio para envio (opcional)
```

### Dependências Instaladas

- `twilio`: Biblioteca oficial do Twilio para Node.js

## Funcionalidades Implementadas

### 1. Notificações Automáticas

O sistema envia SMS automaticamente nos seguintes cenários:

#### Entrada na Fila
Quando um cliente entra na fila, recebe um SMS com:
- Confirmação de entrada na fila
- Posição atual na fila
- Nome da fila

**Exemplo:** "Olá! Você está na posição 3 da fila "Atendimento Geral". Aguarde ser chamado."

#### Chamada do Ticket
Quando o ticket é chamado para atendimento:
- Notificação de que chegou a vez
- Número do ticket
- Nome da fila

**Exemplo:** "Sua vez chegou! Ticket A001 da fila "Atendimento Geral". Dirija-se ao atendimento."

#### Rechamada
Quando um ticket é rechamado, o cliente recebe nova notificação.

### 2. Endpoints de Teste

#### POST `/api/v1/sms/test`
Testa o envio básico de SMS.

```json
{
  "phoneNumber": "+5511999999999",
  "message": "Mensagem de teste"
}
```

#### POST `/api/v1/sms/test-queue-notification`
Testa notificação de entrada na fila.

```json
{
  "phoneNumber": "+5511999999999",
  "queueName": "Atendimento Geral",
  "position": 5
}
```

#### POST `/api/v1/sms/test-call-notification`
Testa notificação de chamada de ticket.

```json
{
  "phoneNumber": "+5511999999999",
  "queueName": "Atendimento Geral",
  "ticketNumber": "A001"
}
```

## Integração nos Serviços

### QueuesService
- `callNext()`: Envia SMS quando ticket é chamado
- `recall()`: Envia SMS quando ticket é rechamado

### TicketsService
- `create()`: Envia SMS de confirmação de entrada na fila

## Tratamento de Erros

O sistema foi projetado para ser resiliente:

1. **Credenciais não configuradas**: O serviço é desabilitado automaticamente
2. **Erro no envio**: Registra log de erro mas não interrompe o fluxo principal
3. **Número inválido**: Tenta enviar mas registra erro se falhar

## Logs

O sistema registra logs para:
- Inicialização do serviço
- Envios bem-sucedidos
- Erros de envio
- Tentativas com credenciais inválidas

## Verificação de Status

Para verificar se o SMS está configurado corretamente:

```typescript
// No seu código
if (smsService.isConfigured()) {
  // SMS está disponível
} else {
  // SMS não configurado
}
```

## Formato de Números de Telefone

Use sempre o formato internacional:
- Brasil: `+5511999999999`
- Estados Unidos: `+15551234567`

## Segurança

- As credenciais do Twilio são armazenadas como variáveis de ambiente
- Não são expostas nos logs ou respostas da API
- O token de autenticação é mantido seguro

## Custos

Cada SMS enviado via Twilio tem um custo. Monitore o uso através do dashboard do Twilio para controlar gastos.

## Troubleshooting

### SMS não está sendo enviado

1. Verifique se as variáveis de ambiente estão configuradas
2. Confirme se o número de telefone está no formato correto
3. Verifique os logs da aplicação para erros
4. Teste usando os endpoints de teste

### Erro de autenticação

- Verifique se `TWILIO_SID` e `TWILIO_TOKEN` estão corretos
- Confirme se a conta Twilio está ativa

### Número de origem não configurado

- Configure `TWILIO_FROM_NUMBER` ou passe o número no método `sendSms`
- Use um número verificado na sua conta Twilio
