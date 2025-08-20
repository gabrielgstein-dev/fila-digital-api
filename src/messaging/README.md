# 🐰 RabbitMQ - Notificações de Senha

Sistema **SIMPLES** para notificar quando uma senha é chamada.

## 🎯 **Como Funciona:**

```
Agente chama próxima senha
         ↓
queues.service.callNext()
         ↓
RabbitMQ (fila: ticket-notifications)
         ↓ 
Consumer processa
         ↓
WebSocket → Cliente recebe notificação
```

## 🔧 **Setup Rápido:**

### 1. **Subir RabbitMQ Local:**
```bash
docker-compose -f docker-compose.dev.yml up -d rabbitmq
```

### 2. **Configurar .env:**
```bash
RABBITMQ_URL=amqp://admin:admin123@localhost:5672
```

### 3. **Testar:**
```bash
# Subir API
npm run start:dev

# Chamar uma senha via POST
# POST /tenants/{tenantId}/queues/{queueId}/call-next
```

## 🎮 **Management UI:**
- **URL**: http://localhost:15672
- **Login**: admin / admin123
- **Fila**: `ticket-notifications`

## 📊 **Como Monitorar:**

### **Via Logs:**
```bash
# Producer (envio)
[TicketNotificationService] Notificação de chamada enviada: Ticket 42 da Recepção

# Consumer (processamento)
[TicketNotificationConsumer] Processando chamada: ticket-123-1234567890
[TicketNotificationConsumer] Notificação enviada via WebSocket para: (11) 99999-1111
```

### **Via RabbitMQ Management:**
- **Messages Ready**: Quantas notificações estão na fila
- **Messages Unacked**: Quantas estão sendo processadas
- **Publish Rate**: Taxa de envio
- **Delivery Rate**: Taxa de entrega

## 🚀 **Fluxo Real:**

1. **Cliente tira senha** → Ticket criado (WAITING)
2. **Agente chama próxima** → `POST /call-next`
3. **API atualiza status** → WAITING → CALLED
4. **Envia para RabbitMQ** → `ticket.called` event
5. **Consumer processa** → Identifica cliente
6. **WebSocket envia** → Cliente recebe em tempo real

## 🔄 **Retry Automático:**

Se WebSocket falhar, RabbitMQ automaticamente:
- ✅ **Tenta novamente** (até 3x)
- ✅ **Backoff exponencial** (1s, 2s, 4s)
- ✅ **Dead Letter Queue** se falhar todas

## 📱 **Para Produção:**

### **Adicionar SMS:**
```typescript
// No ticket-notification.consumer.ts
if (payload.clientPhone) {
  await this.sendSMS({
    to: payload.clientPhone,
    message: `Senha ${payload.ticketNumber} foi chamada!`
  });
}
```

### **Adicionar Push:**
```typescript
// Firebase Cloud Messaging
if (payload.userId) {
  await this.sendPushNotification({
    userId: payload.userId,
    title: `Senha ${payload.ticketNumber}`,
    body: `${payload.queueName} - Dirija-se ao atendimento`
  });
}
```

## ⚡ **Vantagens:**

- ✅ **Simples**: Apenas 2 arquivos principais
- ✅ **Confiável**: RabbitMQ gerencia retry/persistência
- ✅ **Escalável**: Múltiplos consumers automático
- ✅ **Monitorável**: Management UI integrado
- ✅ **Não bloqueia**: API não trava se notificação falhar

## 🎯 **Status Atual:**

✅ **Implementado:**
- Producer (envio)
- Consumer (processamento)
- WebSocket (entrega)
- Integração com call-next

🔄 **Próximos Passos:**
- SMS (Twilio)
- Push (FCM)
- Deploy Cloud Run
