# Fluxo de QR Code para Sistema de Fila Digital

## Visão Geral

Este documento descreve o fluxo completo onde um cliente:
1. Escaneia um QR Code para entrar em uma fila
2. Recebe notificações em tempo real sobre mudanças de senha via SSE

## Endpoints Implementados

### 1. Gerar QR Code para Fila

**Endpoint:** `GET /queues/:id/qrcode`

**Descrição:** Gera um QR Code que direciona o cliente para a página da fila.

**Resposta:**
```json
{
  "queueId": "clq1234567890abcdef",
  "queueName": "Consulta Médica",
  "tenantName": "Centro Clínico",
  "qrCodeUrl": "https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=...",
  "directUrl": "http://localhost:3000/queue/clq1234567890abcdef",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### 2. Entrar na Fila (Requer Autenticação)

**Endpoint:** `POST /queues/:queueId/tickets`

**Descrição:** Permite que clientes autenticados entrem na fila. Requer token JWT válido.

**Headers:**
```
Authorization: Bearer <JWT_TOKEN>
```

**Body:**
```json
{
  "clientName": "João Silva",
  "clientPhone": "+5511999999999",
  "clientEmail": "joao@email.com"
}
```

**Resposta:**
```json
{
  "id": "tkt1234567890abcdef",
  "myCallingToken": "N001",
  "status": "WAITING",
  "position": 1,
  "estimatedTime": 300,
  "queueId": "clq1234567890abcdef",
  "clientName": "João Silva",
  "clientPhone": "+5511999999999",
  "clientEmail": "joao@email.com",
  "userId": "usr1234567890abcdef",
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

**Erros:**
- `401 Unauthorized` - Token JWT inválido ou expirado
- `400 Bad Request` - Fila cheia ou inativa
- `404 Not Found` - Fila não encontrada

### 3. Verificar Status da Fila (Público)

**Endpoint:** `GET /queues/:queueId/status`

**Descrição:** Retorna o status atual da fila para clientes.

**Resposta:**
```json
{
  "queueId": "clq1234567890abcdef",
  "queueName": "Consulta Médica",
  "tenantName": "Centro Clínico",
  "currentCallingToken": "N001",
  "totalWaiting": 5,
  "estimatedWaitTime": 1500,
  "lastUpdated": "2024-01-15T10:30:00.000Z"
}
```

### 4. Verificar Status do Ticket (Público)

**Endpoint:** `GET /tickets/:id`

**Descrição:** Retorna informações detalhadas sobre um ticket específico.

## SSE Events

### Conectar ao SSE

```javascript
// Conectar via EventSource (SSE)
const eventSource = new EventSource('/api/v1/queues/clq1234567890abcdef/events');

// Escutar eventos de atualização da fila
eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Atualização da fila:', data);

  // Atualizar interface com novos dados
  if (data.type === 'queue-updated') {
    document.getElementById('currentToken').textContent = data.currentCallingToken || 'Aguardando...';
    document.getElementById('totalWaiting').textContent = data.totalWaiting || 0;
    document.getElementById('estimatedTime').textContent = Math.ceil((data.totalWaiting || 0) * 5) + ' minutos';
  }

  if (data.type === 'ticket-called') {
    alert(`Senha ${data.ticket.myCallingToken} está sendo chamada!`);
  }
};

eventSource.onerror = (error) => {
  console.error('Erro na conexão SSE:', error);
  // Implementar lógica de reconexão
};
```

### Eventos Recebidos

#### 1. Atualização de Status da Fila
Recebido via SSE como evento `queue-updated`

#### 2. Ticket Chamado
Recebido via SSE como evento `ticket-called`

#### 3. Atualização de Status do Ticket
Recebido via SSE como evento `ticket-status-updated`

#### 4. Atualização de Senha Atual
Recebido via SSE como evento `current-calling-token-updated`

## 🔄 Fluxo Completo do Cliente

### 1. Escanear QR Code
- Cliente escaneia o QR Code impresso na fila
- É redirecionado para a página da fila

### 2. Autenticação
- Cliente faz login no app (Google OAuth, email/senha, etc.)
- Recebe token JWT válido
- Token é armazenado no app

### 3. Entrar na Fila
- Cliente preenche nome e contato
- Sistema valida token JWT
- Sistema gera um ticket com senha única
- Cliente recebe confirmação com sua senha

### 4. Conectar ao SSE
- Cliente se conecta ao SSE
- Entra na sala da fila para receber atualizações
- Entra na sala do seu ticket específico

### 5. Aguardar e Receber Notificações
- Cliente recebe atualizações em tempo real sobre:
  - Posição na fila
  - Tempo estimado de espera
  - Senhas sendo chamadas
  - Mudanças de status da fila

### 6. Ser Chamado
- Quando sua senha for chamada, recebe notificação
- Pode ver sua senha sendo exibida no painel
- Recebe instruções para ir ao atendimento

## Implementação no Frontend

### Exemplo de Página de Fila

```html
<!DOCTYPE html>
<html>
<head>
    <title>Fila - Consulta Médica</title>
</head>
<body>
    <h1>Fila: Consulta Médica</h1>

    <div id="status">
        <h2>Status da Fila</h2>
        <p>Senha Atual: <span id="currentToken">Aguardando...</span></p>
        <p>Pessoas na Fila: <span id="totalWaiting">0</span></p>
        <p>Tempo Estimado: <span id="estimatedTime">0</span> minutos</p>
    </div>

    <div id="myTicket" style="display: none;">
        <h2>Minha Senha</h2>
        <p>Sua senha: <span id="myToken"></span></p>
        <p>Posição: <span id="myPosition"></span></p>
    </div>

    <script>
        const socket = io();
        const queueId = 'clq1234567890abcdef';

        // Entrar na fila
        socket.emit('join-queue-client', { queueId });

        // Receber atualizações da fila
        socket.on('queue-status-updated', (data) => {
            document.getElementById('totalWaiting').textContent = data.totalWaiting;
            document.getElementById('estimatedTime').textContent = Math.round(data.estimatedWaitTime / 60);
        });

        // Receber chamadas de senha
        socket.on('call-made', (data) => {
            if (data.type === 'ticket-called') {
                document.getElementById('currentToken').textContent = data.ticket.myCallingToken;
            }
        });

        // Função para entrar na fila
        async function enterQueue() {
            const response = await fetch(`/queues/${queueId}/tickets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    clientName: document.getElementById('clientName').value,
                    clientPhone: document.getElementById('clientPhone').value,
                    clientEmail: document.getElementById('clientEmail').value
                })
            });

            const ticket = await response.json();

            // Mostrar informações do ticket
            document.getElementById('myToken').textContent = ticket.myCallingToken;
            document.getElementById('myPosition').textContent = ticket.position;
            document.getElementById('myTicket').style.display = 'block';

            // Entrar no ticket para receber atualizações
            socket.emit('join-ticket', { ticketId: ticket.id });
        }
    </script>
</body>
</html>
```

## Configuração de Ambiente

### Variáveis de Ambiente

```bash
# URL do frontend para gerar QR Codes
FRONTEND_URL=https://fila.centroclinico.com
```

## 🔒 Segurança

- **Endpoints de consulta** são públicos (`@Public()`)
- **Endpoints de entrada na fila** requerem autenticação JWT
- **Endpoints de gerenciamento** requerem autenticação JWT + permissões de tenant
- **Validação de dados** de entrada com DTOs
- **Rate limiting** implementado para prevenir spam
- **Tokens JWT** com expiração configurável
- **Validação de tenant** para operações restritas

## Monitoramento

- Logs de criação de tickets
- Logs de mudanças de status
- Métricas de tempo de espera
- Alertas para filas cheias ou com problemas

## Próximos Passos

1. Implementar notificações push para dispositivos móveis
2. Adicionar sistema de prioridades para casos especiais
3. Implementar histórico de atendimentos
4. Adicionar analytics e relatórios
5. Implementar sistema de agendamento
6. Adicionar integração com sistemas externos
