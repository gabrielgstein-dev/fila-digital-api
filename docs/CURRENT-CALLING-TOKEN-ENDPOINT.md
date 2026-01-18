# Endpoint de Atualização do CurrentCallingToken

## Descrição
Este endpoint permite atualizar o `currentCallingToken` de um ticket específico.

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

## Notificação de Atualização

A atualização do token pode ser consultada através dos endpoints REST da API.
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

## Como Consultar Atualizações

### 1. Via API REST
```javascript
// Consultar status atual via API
const response = await fetch(`/api/v1/tenants/${tenantId}/current-calling-token`);
const data = await response.json();
console.log('Token atual:', data);

// Para atualizações em tempo real, implementar polling
setInterval(async () => {
  const response = await fetch(`/api/v1/tenants/${tenantId}/current-calling-token`);
  const data = await response.json();
  updateCurrentCallingTokenDisplay(data.currentCallingToken);
}, 5000); // A cada 5 segundos
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

### Cliente JavaScript
```javascript
// Consultar periodicamente via API
async function getCurrentCallingToken(queueId) {
  const response = await fetch(`/api/v1/queues/${queueId}/current-calling-token`);
  return await response.json();
}

// Implementar polling para atualizações
let pollingInterval;

function startPolling(queueId) {
  pollingInterval = setInterval(async () => {
    try {
      const data = await getCurrentCallingToken(queueId);
      updateCurrentCallingTokenDisplay(data.currentCallingToken);
    } catch (error) {
      console.error('Erro ao buscar token:', error);
    }
  }, 3000); // A cada 3 segundos
}

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval);
  }
}

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
- Validação de dados é feita tanto no controller quanto no service
- Guard de segurança valida permissões de tenant em tempo de execução

## Validação de Tenant
O endpoint utiliza o `TicketTenantAuthGuard` que:
1. Valida o JWT token do usuário
2. Busca o ticket no banco de dados
3. Verifica se o usuário pertence ao tenant do ticket
4. Retorna erro 403 se o usuário não tiver permissão
5. Permite acesso apenas se todas as validações passarem
