# Endpoint de Atualização do CurrentCallingToken

## Descrição
Este endpoint permite atualizar o `currentCallingToken` de um ticket específico e dispara um evento websocket para notificar todos os clientes inscritos sobre a mudança.

## Endpoint
```
PUT /tickets/:id/current-calling-token
```

## Autenticação
Requer autenticação JWT (Bearer Token) e validação de tenant.

## Segurança
- **JWT Auth**: Usuário deve estar autenticado
- **Tenant Validation**: Usuário deve pertencer ao tenant do ticket
- **Acesso Negado**: Usuários de outros tenants recebem erro 403

## Parâmetros
- `id` (path): ID do ticket a ser atualizado

## Body
```json
{
  "currentCallingToken": "B123"
}
```

## Respostas
- **200**: Token atualizado com sucesso
- **400**: Dados inválidos no body
- **401**: Não autenticado
- **403**: Acesso negado (usuário não pertence ao tenant)
- **404**: Ticket não encontrado

## Evento WebSocket
Após a atualização, um evento é emitido para todos os clientes inscritos:

### Evento: `current-calling-token-updated`
```json
{
  "ticketId": "ticket_id",
  "oldToken": "B122",
  "newToken": "B123",
  "queueId": "queue_id",
  "queueName": "Fila de Exames",
  "tenantId": "tenant_id",
  "tenantName": "Nome da Empresa"
}
```

## Como se inscrever para receber atualizações

### 1. Por Tenant (Empresa)
```javascript
// Conectar ao websocket
const socket = io('ws://localhost:3000');

// Inscrever para receber atualizações de um tenant específico
socket.emit('join-tenant-current-calling-token', {
  tenantId: 'tenant_id'
});

// Escutar atualizações
socket.on('current-calling-token-updated', (data) => {
  console.log('Token atualizado:', data);
});

// Cancelar inscrição
socket.emit('leave-tenant-current-calling-token', {
  tenantId: 'tenant_id'
});
```

### 2. Por Tipo de Fila
```javascript
// Inscrever para receber atualizações de um tipo de fila específico
socket.emit('join-queue-type-current-calling-token', {
  queueType: 'GENERAL'
});

// Escutar atualizações
socket.on('current-calling-token-updated', (data) => {
  console.log('Token atualizado:', data);
});

// Cancelar inscrição
socket.emit('leave-queue-type-current-calling-token', {
  queueType: 'GENERAL'
});
```

## Exemplo de Uso

### Atualizar token via API
```bash
curl -X PUT \
  http://localhost:3000/tickets/ticket_id/current-calling-token \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "currentCallingToken": "B123"
  }'
```

### Cliente WebSocket em JavaScript
```javascript
const socket = io('ws://localhost:3000');

// Inscrever para receber atualizações
socket.emit('join-tenant-current-calling-token', {
  tenantId: 'tenant_id'
});

// Escutar atualizações
socket.on('current-calling-token-updated', (data) => {
  if (data.tenantId === 'tenant_id') {
    // Atualizar UI com novo token
    updateCurrentCallingTokenDisplay(data.newToken);
  }
});

function updateCurrentCallingTokenDisplay(token) {
  const display = document.getElementById('current-calling-token');
  if (display) {
    display.textContent = token;
  }
}
```

## Casos de Uso
1. **Painel de Atendimento**: Atualizar o token atual sendo chamado
2. **Display de Senhas**: Mostrar a senha atual em tempo real
3. **Sincronização Multi-tela**: Manter todas as telas sincronizadas com o token atual
4. **Auditoria**: Rastrear mudanças de tokens para fins de auditoria

## Segurança
- Apenas usuários autenticados podem atualizar tokens
- Usuários só podem modificar tickets do seu próprio tenant
- O evento é emitido apenas para clientes inscritos
- Validação de dados é feita tanto no controller quanto no service
- Guard de segurança valida permissões de tenant em tempo de execução

## Validação de Tenant
O endpoint utiliza o `TicketTenantAuthGuard` que:
1. Valida o JWT token do usuário
2. Busca o ticket no banco de dados
3. Verifica se o usuário pertence ao tenant do ticket
4. Retorna erro 403 se o usuário não tiver permissão
5. Permite acesso apenas se todas as validações passarem
