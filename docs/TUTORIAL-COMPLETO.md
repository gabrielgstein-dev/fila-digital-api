# 🎫 Tutorial Completo - Sistema de Fila Digital

## 📋 **Visão Geral do Fluxo**

Este tutorial demonstra como usar o sistema de fila digital do início ao fim:

1. 🏢 **Empresa** se cadastra no sistema
2. 👤 **Admin** da empresa cria filas
3. 🎟️ **Cliente** tira senha e entra na fila
4. 📞 **Atendente** chama próximo da fila
5. 🔔 **Cliente** recebe notificação em tempo real

---

## 🏢 **Passo 1: Cadastrar Empresa (Tenant)**

### **1.1 Criar Tenant**
```http
POST /api/v1/tenants
Content-Type: application/json

{
  "name": "Centro Clínico São Paulo",
  "slug": "centro-clinico-sp",
  "email": "contato@centroclinico.com.br",
  "phone": "(11) 3333-4444"
}
```

**Resposta:**
```json
{
  "id": "clp1234567890abcdef123456",
  "name": "Centro Clínico São Paulo",
  "slug": "centro-clinico-sp",
  "email": "contato@centroclinico.com.br",
  "phone": "(11) 3333-4444",
  "isActive": true,
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

### **1.2 Criar Usuário Admin da Empresa**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/agents
Content-Type: application/json

{
  "name": "Dr. João Silva",
  "email": "joao.silva@centroclinico.com.br",
  "password": "senha123456",
  "role": "ADMIN"
}
```

**Resposta:**
```json
{
  "id": "cla1234567890abcdef123456",
  "name": "Dr. João Silva",
  "email": "joao.silva@centroclinico.com.br",
  "role": "ADMIN",
  "isActive": true,
  "tenantId": "clp1234567890abcdef123456"
}
```

---

## 🔐 **Passo 2: Login do Admin**

### **2.1 Fazer Login**
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "joao.silva@centroclinico.com.br",
  "password": "senha123456"
}
```

**Resposta:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "cla1234567890abcdef123456",
    "name": "Dr. João Silva",
    "email": "joao.silva@centroclinico.com.br",
    "role": "ADMIN",
    "tenantId": "clp1234567890abcdef123456"
  }
}
```

**⚠️ Importante:** Salve o `access_token` para usar nos próximos requests!

---

## 🎯 **Passo 3: Criar Filas**

### **Cenário A: 🏥 Centro Clínico (Múltiplas Filas)**

#### **3.1 Criar Fila de Endocrinologia**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Endocrinologia",
  "description": "Consultas com endocrinologista - Dr. Maria Santos",
  "queueType": "GENERAL",
  "capacity": 20,
  "avgServiceTime": 900
}
```

#### **3.2 Criar Fila de Pediatria**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Pediatria",
  "description": "Consultas pediátricas - Dra. Ana Costa",
  "queueType": "PRIORITY",
  "capacity": 25,
  "avgServiceTime": 1200
}
```

#### **3.3 Criar Fila de Raio-X**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Raio-X",
  "description": "Exames de radiografia",
  "queueType": "GENERAL", 
  "capacity": 15,
  "avgServiceTime": 300
}
```

#### **3.4 Criar Fila de Oftalmologia**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Oftalmologia", 
  "description": "Consultas oftalmológicas - Dr. Carlos Lima",
  "queueType": "GENERAL",
  "capacity": 12,
  "avgServiceTime": 600
}
```

### **Cenário B: 🏥 Laboratório Sabin (Fila Única)**

#### **3.5 Criar Fila Única**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json

{
  "name": "Atendimento Geral",
  "description": "Fila única para todos os exames laboratoriais",
  "queueType": "GENERAL",
  "capacity": 50,
  "avgServiceTime": 300
}
```

**Resposta para todas as filas:**
```json
{
  "id": "clq1234567890abcdef123456",
  "name": "Endocrinologia",
  "description": "Consultas com endocrinologista - Dr. Maria Santos",
  "queueType": "GENERAL",
  "capacity": 20,
  "avgServiceTime": 900,
  "isActive": true,
  "tenantId": "clp1234567890abcdef123456",
  "createdAt": "2024-01-15T10:15:00.000Z"
}
```

---

## 📋 **Passo 4: Listar Filas Disponíveis**

### **4.1 Listar Todas as Filas do Centro Clínico**
```http
GET /api/v1/tenants/clp1234567890abcdef123456/queues
```

### **4.2 Ver TODOS os Clientes em TODAS as Filas (Dashboard Consolidado)**
```http
GET /api/v1/tenants/clp1234567890abcdef123456/queues/all-tickets
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta Completa:**
```json
{
  "summary": {
    "totalQueues": 4,
    "totalWaiting": 8,
    "totalCalled": 2,
    "totalCompleted": 15,
    "avgWaitTime": 1800,
    "lastUpdated": "2024-01-15T11:30:00.000Z"
  },
  "queues": [
    {
      "id": "clq1234567890abcdef123456",
      "name": "Endocrinologia",
      "description": "Consultas com endocrinologista",
      "queueType": "GENERAL",
      "capacity": 20,
      "avgServiceTime": 900,
      "currentNumber": 3,
      "totalWaiting": 2,
      "totalCalled": 1,
      "tickets": [
        {
          "id": "clt1234567890abcdef123456",
          "number": 3,
          "clientName": "Ana Costa",
          "clientPhone": "(11) 99999-2222",
          "clientEmail": "ana@email.com",
          "status": "CALLED",
          "priority": 1,
          "estimatedTime": 0,
          "position": 0,
          "createdAt": "2024-01-15T10:30:00.000Z",
          "calledAt": "2024-01-15T11:00:00.000Z"
        },
        {
          "id": "clt2234567890abcdef123456", 
          "number": 4,
          "clientName": "Maria Silva",
          "clientPhone": "(11) 99999-1111",
          "clientEmail": "maria@email.com",
          "status": "WAITING",
          "priority": 1,
          "estimatedTime": 900,
          "position": 1,
          "createdAt": "2024-01-15T10:45:00.000Z",
          "calledAt": null
        },
        {
          "id": "clt3234567890abcdef123456",
          "number": 5,
          "clientName": "João Santos",
          "clientPhone": "(11) 99999-3333", 
          "status": "WAITING",
          "priority": 2,
          "estimatedTime": 1800,
          "position": 2,
          "createdAt": "2024-01-15T10:50:00.000Z",
          "calledAt": null
        }
      ]
    },
    {
      "id": "clq2234567890abcdef123456",
      "name": "Pediatria", 
      "queueType": "PRIORITY",
      "currentNumber": 1,
      "totalWaiting": 3,
      "totalCalled": 0,
      "tickets": [
        {
          "id": "clt4234567890abcdef123456",
          "number": 1,
          "clientName": "Pedro Santos (filho)",
          "status": "WAITING",
          "priority": 3,
          "position": 1,
          "estimatedTime": 1200
        },
        {
          "id": "clt5234567890abcdef123456", 
          "number": 2,
          "clientName": "Carla Lima (filha)",
          "status": "WAITING",
          "priority": 1,
          "position": 2,
          "estimatedTime": 2400
        }
      ]
    },
    {
      "id": "clq3234567890abcdef123456",
      "name": "Raio-X",
      "currentNumber": 2,
      "totalWaiting": 1,
      "totalCalled": 1,
      "tickets": [
        {
          "id": "clt6234567890abcdef123456",
          "number": 2,
          "clientName": "José Costa",
          "status": "CALLED",
          "priority": 1,
          "position": 0,
          "calledAt": "2024-01-15T11:25:00.000Z"
        },
        {
          "id": "clt7234567890abcdef123456",
          "number": 3,
          "clientName": "Laura Oliveira", 
          "status": "WAITING",
          "priority": 1,
          "position": 1,
          "estimatedTime": 300
        }
      ]
    },
    {
      "id": "clq4234567890abcdef123456",
      "name": "Oftalmologia",
      "currentNumber": 0,
      "totalWaiting": 2,
      "totalCalled": 0,
      "tickets": [
        {
          "id": "clt8234567890abcdef123456",
          "number": 1,
          "clientName": "Roberto Silva",
          "status": "WAITING",
          "priority": 1,
          "position": 1,
          "estimatedTime": 600
        },
        {
          "id": "clt9234567890abcdef123456",
          "number": 2,
          "clientName": "Fernanda Costa",
          "status": "WAITING", 
          "priority": 1,
          "position": 2,
          "estimatedTime": 1200
        }
      ]
    }
  ]
}
```

**🎯 Este endpoint é perfeito para:**
- **Dashboard do gestor** - Visão completa de todas as filas
- **Painel de TV** na recepção - Mostrar todos os números atuais
- **Relatórios em tempo real** - Estatísticas consolidadas
- **Monitoramento** - Acompanhar movimento geral do estabelecimento

**Resposta:**
```json
[
  {
    "id": "clq1234567890abcdef123456",
    "name": "Endocrinologia",
    "description": "Consultas com endocrinologista",
    "queueType": "GENERAL",
    "capacity": 20,
    "avgServiceTime": 900,
    "currentTickets": 3,
    "estimatedWaitTime": 2700
  },
  {
    "id": "clq2234567890abcdef123456", 
    "name": "Pediatria",
    "description": "Consultas pediátricas",
    "queueType": "PRIORITY",
    "capacity": 25,
    "avgServiceTime": 1200,
    "currentTickets": 1,
    "estimatedWaitTime": 1200
  },
  {
    "id": "clq3234567890abcdef123456",
    "name": "Raio-X", 
    "description": "Exames de radiografia",
    "queueType": "GENERAL",
    "capacity": 15,
    "avgServiceTime": 300,
    "currentTickets": 0,
    "estimatedWaitTime": 0
  },
  {
    "id": "clq4234567890abcdef123456",
    "name": "Oftalmologia",
    "description": "Consultas oftalmológicas", 
    "queueType": "GENERAL",
    "capacity": 12,
    "avgServiceTime": 600,
    "currentTickets": 2,
    "estimatedWaitTime": 1200
  }
]
```

---

## 🎟️ **Passo 5: Cliente Tira Senha**

### **5.1 Cliente entra na Fila de Endocrinologia**
```http
POST /api/v1/queues/clq1234567890abcdef123456/tickets
Content-Type: application/json

{
  "clientName": "Maria Silva",
  "clientPhone": "(11) 99999-1111",
  "clientEmail": "maria.silva@email.com",
  "priority": 1
}
```

**Resposta:**
```json
{
  "id": "clt1234567890abcdef123456",
  "number": 4,
  "priority": 1,
  "status": "WAITING",
  "clientName": "Maria Silva",
  "clientPhone": "(11) 99999-1111", 
  "clientEmail": "maria.silva@email.com",
  "estimatedTime": 3600,
  "queueId": "clq1234567890abcdef123456",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "queue": {
    "name": "Endocrinologia",
    "avgServiceTime": 900
  }
}
```

### **5.2 Cliente entra na Fila de Pediatria**
```http
POST /api/v1/queues/clq2234567890abcdef123456/tickets
Content-Type: application/json

{
  "clientName": "Pedro Santos (filho)",
  "clientPhone": "(11) 99999-2222",
  "priority": 2
}
```

### **5.3 Cliente entra na Fila de Raio-X**
```http
POST /api/v1/queues/clq3234567890abcdef123456/tickets
Content-Type: application/json

{
  "clientName": "João Costa",
  "clientPhone": "(11) 99999-3333",
  "priority": 1
}
```

---

## 👁️ **Passo 6: Cliente Consulta Status da Fila**

### **6.1 Verificar Status do Ticket**
```http
GET /api/v1/tickets/clt1234567890abcdef123456
```

**Resposta:**
```json
{
  "id": "clt1234567890abcdef123456",
  "number": 4,
  "priority": 1,
  "status": "WAITING",
  "clientName": "Maria Silva",
  "estimatedTime": 2700,
  "position": 3,
  "queue": {
    "name": "Endocrinologia",
    "currentNumber": 1,
    "totalWaiting": 3
  },
  "createdAt": "2024-01-15T10:30:00.000Z"
}
```

### **6.2 Cliente Acompanha em Tempo Real (WebSocket)**
```javascript
// Conectar ao WebSocket
const socket = io('http://localhost:3001', {
  query: {
    ticketId: 'clt1234567890abcdef123456'
  }
});

// Escutar atualizações da fila
socket.on('queue-update', (data) => {
  console.log('Atualização da fila:', data);
  // {
  //   queueId: 'clq1234567890abcdef123456',
  //   currentNumber: 2,
  //   totalWaiting: 2,
  //   estimatedTime: 1800
  // }
});

// Escutar quando for chamado
socket.on('ticket-called', (data) => {
  console.log('Seu número foi chamado!', data);
  // {
  //   ticketId: 'clt1234567890abcdef123456',
  //   number: 4,
  //   message: 'Número 4 - Endocrinologia - Dirija-se ao consultório 3'
  // }
});
```

---

## 📞 **Passo 7: Atendente Chama Próximo da Fila**

### **7.1 Chamar Próximo Paciente (Endocrinologia)**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues/clq1234567890abcdef123456/call-next
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta:**
```json
{
  "id": "clt0234567890abcdef123456",
  "number": 2,
  "status": "CALLED",
  "clientName": "Ana Costa",
  "calledAt": "2024-01-15T10:45:00.000Z",
  "queue": {
    "name": "Endocrinologia",
    "currentNumber": 2
  }
}
```

### **7.2 Chamar Próximo Paciente (Raio-X)**
```http
POST /api/v1/tenants/clp1234567890abcdef123456/queues/clq3234567890abcdef123456/call-next
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 🔄 **Passo 8: Gerenciar Atendimento**

### **8.1 Rechamar Paciente (caso não compareça)**
```http
PUT /api/v1/tickets/clt0234567890abcdef123456/recall
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **8.2 Pular Paciente (caso não compareça)**
```http
PUT /api/v1/tickets/clt0234567890abcdef123456/skip
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### **8.3 Completar Atendimento**
```http
PUT /api/v1/tickets/clt0234567890abcdef123456/complete
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Resposta:**
```json
{
  "id": "clt0234567890abcdef123456",
  "number": 2,
  "status": "COMPLETED",
  "clientName": "Ana Costa",
  "completedAt": "2024-01-15T11:00:00.000Z",
  "serviceTime": 900
}
```

---

## 🔔 **Passo 9: Sistema de Notificações em Tempo Real**

### **9.1 Configurar WebSocket (Frontend)**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Fila Digital - Cliente</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
    <div id="ticket-info">
        <h2>Seu Ticket: #<span id="ticket-number">4</span></h2>
        <p>Fila: <span id="queue-name">Endocrinologia</span></p>
        <p>Status: <span id="status">WAITING</span></p>
        <p>Posição: <span id="position">3</span></p>
        <p>Tempo estimado: <span id="estimated-time">45 min</span></p>
    </div>

    <div id="notifications"></div>

    <script>
        const ticketId = 'clt1234567890abcdef123456';
        
        // Conectar ao WebSocket
        const socket = io('http://localhost:3001', {
            query: { ticketId: ticketId }
        });

        // Atualização da posição na fila
        socket.on('queue-update', (data) => {
            document.getElementById('position').textContent = data.position;
            document.getElementById('estimated-time').textContent = 
                Math.round(data.estimatedTime / 60) + ' min';
            
            showNotification(`Posição atualizada: ${data.position}º na fila`);
        });

        // Número foi chamado
        socket.on('ticket-called', (data) => {
            document.getElementById('status').textContent = 'CHAMADO';
            document.getElementById('position').textContent = '0';
            
            showNotification(`🔔 SEU NÚMERO FOI CHAMADO! Dirija-se ao atendimento.`, 'success');
            
            // Tocar som de notificação
            playNotificationSound();
        });

        // Rechamada
        socket.on('ticket-recalled', (data) => {
            showNotification(`📢 SEGUNDA CHAMADA - Número ${data.number}`, 'warning');
        });

        function showNotification(message, type = 'info') {
            const notification = document.createElement('div');
            notification.className = `notification ${type}`;
            notification.textContent = message;
            notification.style.cssText = `
                background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
                color: white;
                padding: 15px;
                margin: 10px 0;
                border-radius: 5px;
                animation: slideIn 0.5s ease-in;
            `;
            
            document.getElementById('notifications').appendChild(notification);
            
            // Remover após 5 segundos
            setTimeout(() => {
                notification.remove();
            }, 5000);
        }

        function playNotificationSound() {
            // Criar som de notificação
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 1);
        }
    </script>
</body>
</html>
```

### **9.2 Painel de Atendimento (Frontend Admin)**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Painel de Atendimento - Endocrinologia</title>
    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
</head>
<body>
    <div id="queue-panel">
        <h1>Endocrinologia - Dr. Maria Santos</h1>
        
        <div id="current-ticket">
            <h2>Atendendo Agora:</h2>
            <div class="ticket-card">
                <h3>Número: <span id="current-number">2</span></h3>
                <p>Paciente: <span id="current-patient">Ana Costa</span></p>
                <p>Chamado às: <span id="called-time">10:45</span></p>
            </div>
            
            <div class="actions">
                <button onclick="recallTicket()">🔁 Rechamar</button>
                <button onclick="skipTicket()">⏭️ Pular</button>
                <button onclick="completeTicket()">✅ Completar</button>
            </div>
        </div>

        <div id="queue-status">
            <h2>Próximos na Fila:</h2>
            <div id="waiting-list">
                <div class="waiting-ticket">
                    <span>3. Carlos Silva</span>
                    <span>10:35</span>
                </div>
                <div class="waiting-ticket">
                    <span>4. Maria Silva</span>
                    <span>10:30</span>
                </div>
                <div class="waiting-ticket">
                    <span>5. José Santos</span>
                    <span>10:28</span>
                </div>
            </div>
            
            <button onclick="callNext()" class="call-next-btn">
                📞 Chamar Próximo
            </button>
        </div>
    </div>

    <script>
        const queueId = 'clq1234567890abcdef123456';
        const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';

        // Conectar ao WebSocket
        const socket = io('http://localhost:3001');

        // Escutar atualizações da fila
        socket.on('queue-update', (data) => {
            if (data.queueId === queueId) {
                updateQueueDisplay(data);
            }
        });

        async function callNext() {
            try {
                const response = await fetch(`/api/v1/tenants/clp1234567890abcdef123456/queues/${queueId}/call-next`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${authToken}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                const ticket = await response.json();
                updateCurrentTicket(ticket);
                
            } catch (error) {
                alert('Erro ao chamar próximo: ' + error.message);
            }
        }

        async function recallTicket() {
            const currentTicketId = getCurrentTicketId();
            try {
                await fetch(`/api/v1/tickets/${currentTicketId}/recall`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
            } catch (error) {
                alert('Erro ao rechamar: ' + error.message);
            }
        }

        async function skipTicket() {
            const currentTicketId = getCurrentTicketId();
            try {
                await fetch(`/api/v1/tickets/${currentTicketId}/skip`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                // Chamar próximo automaticamente
                callNext();
                
            } catch (error) {
                alert('Erro ao pular: ' + error.message);
            }
        }

        async function completeTicket() {
            const currentTicketId = getCurrentTicketId();
            try {
                await fetch(`/api/v1/tickets/${currentTicketId}/complete`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                
                // Limpar ticket atual
                clearCurrentTicket();
                
            } catch (error) {
                alert('Erro ao completar: ' + error.message);
            }
        }

        function updateCurrentTicket(ticket) {
            document.getElementById('current-number').textContent = ticket.number;
            document.getElementById('current-patient').textContent = ticket.clientName;
            document.getElementById('called-time').textContent = 
                new Date(ticket.calledAt).toLocaleTimeString();
        }

        function updateQueueDisplay(data) {
            // Atualizar lista de espera
            const waitingList = document.getElementById('waiting-list');
            waitingList.innerHTML = '';
            
            data.waitingTickets.forEach(ticket => {
                const div = document.createElement('div');
                div.className = 'waiting-ticket';
                div.innerHTML = `
                    <span>${ticket.number}. ${ticket.clientName}</span>
                    <span>${new Date(ticket.createdAt).toLocaleTimeString()}</span>
                `;
                waitingList.appendChild(div);
            });
        }

        function getCurrentTicketId() {
            // Implementar lógica para obter ID do ticket atual
            return 'clt0234567890abcdef123456';
        }

        function clearCurrentTicket() {
            document.getElementById('current-number').textContent = '-';
            document.getElementById('current-patient').textContent = 'Nenhum';
            document.getElementById('called-time').textContent = '-';
        }
    </script>
</body>
</html>
```

---

## 📱 **Passo 9: APP do Cliente - Endpoints para Multi-Filas**

### **9.1 Buscar TODAS as Senhas do Cliente (Multi-fila)**
```http
GET /api/v1/clients/my-tickets?phone=(11) 99999-1111
```

**Permite que o cliente veja TODAS suas senhas ativas** em múltiplas filas e estabelecimentos diferentes.

**Resposta:**
```json
{
  "client": {
    "identifier": "(11) 99999-1111",
    "totalActiveTickets": 3
  },
  "tickets": [
    {
      "id": "clt1234567890abcdef123456",
      "number": 15,
      "status": "WAITING",
      "priority": 2,
      "position": 2,
      "estimatedTime": 1800,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "queue": {
        "id": "clq1234567890abcdef123456",
        "name": "Endocrinologia",
        "queueType": "GENERAL",
        "currentNumber": 13,
        "avgServiceTime": 900,
        "tenant": {
          "name": "Centro Clínico São Paulo",
          "slug": "centro-clinico-sp"
        }
      }
    },
    {
      "id": "clt2234567890abcdef123456",
      "number": 8,
      "status": "CALLED",
      "priority": 1,
      "position": 0,
      "estimatedTime": 0,
      "createdAt": "2024-01-15T09:45:00.000Z",
      "calledAt": "2024-01-15T11:15:00.000Z",
      "queue": {
        "id": "clq2234567890abcdef123456",
        "name": "Pediatria",
        "currentNumber": 8,
        "tenant": {
          "name": "Centro Clínico São Paulo"
        }
      }
    }
  ]
}
```

### **9.2 Dashboard Consolidado do Cliente**
```http
GET /api/v1/clients/dashboard?phone=(11) 99999-1111
```

**Dashboard completo** com estatísticas consolidadas e métricas em tempo real.

**Resposta:**
```json
{
  "client": {
    "identifier": "(11) 99999-1111",
    "totalActiveTickets": 2
  },
  "summary": {
    "totalWaiting": 1,
    "totalCalled": 1,
    "avgWaitTime": 900,
    "nextCallEstimate": 1800,
    "establishmentsCount": 1
  },
  "realTimeMetrics": {
    "currentServiceSpeed": 4.5,
    "avgTimeSinceLastCall": 120,
    "trendDirection": "accelerating"
  }
}
```

### **9.3 Métricas de Velocidade em Tempo Real**
```http
GET /api/v1/clients/queue-metrics?queueId=clq1234567890abcdef123456
```

**Velocidade atual de atendimento** e previsões inteligentes.

**Resposta:**
```json
{
  "queue": {
    "id": "clq1234567890abcdef123456",
    "name": "Endocrinologia",
    "currentNumber": 13
  },
  "currentMetrics": {
    "serviceSpeed": 6,
    "timeSinceLastCall": 180,
    "avgCallInterval": 720,
    "trendDirection": "accelerating"
  },
  "predictions": {
    "nextCallIn": 540,
    "queueClearTime": 2160
  }
}
```

**📊 Métricas Explicadas:**
- **serviceSpeed**: Atendimentos por hora na última hora
- **timeSinceLastCall**: Segundos desde a última chamada
- **avgCallInterval**: Intervalo médio entre chamadas (segundos)
- **trendDirection**: `accelerating` | `stable` | `slowing`
- **nextCallIn**: Próxima chamada estimada em segundos
- **queueClearTime**: Tempo para limpar toda a fila (segundos)

### **9.4 WebSocket Multi-Cliente**

**Conectar cliente a múltiplas filas:**
```javascript
// Cliente conecta com seu identificador
socket.emit('join-client', { phone: '(11) 99999-1111' });

// Receber notificações de TODAS as senhas
socket.on('client-update', (data) => {
    console.log('Atualização em qualquer fila:', data);
    refreshDashboard();
});

socket.on('ticket-called', (data) => {
    console.log('Sua senha foi chamada!', data);
    showNotification(`🔔 Senha ${data.number} chamada na ${data.queueName}!`);
});
```

---

## 📱 **Passo 10: Interface do Cliente (App/PWA)**

### **10.1 QR Code para Tirar Senha**
```html
<!-- Gerar QR Code para cada fila -->
<div class="qr-code-container">
    <h3>Endocrinologia</h3>
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=https://fila.centroclinico.com/queue/clq1234567890abcdef123456" alt="QR Code">
    <p>Escaneie para tirar sua senha</p>
</div>
```

### **10.2 Interface Responsiva para Smartphone**
```html
<div class="mobile-queue-interface">
    <div class="queue-selector">
        <h2>Escolha sua fila:</h2>
        <div class="queue-options">
            <button class="queue-btn" onclick="joinQueue('clq1234567890abcdef123456')">
                🩺 Endocrinologia
                <span class="wait-time">~45 min</span>
            </button>
            <button class="queue-btn" onclick="joinQueue('clq2234567890abcdef123456')">
                👶 Pediatria
                <span class="wait-time">~20 min</span>
            </button>
            <button class="queue-btn" onclick="joinQueue('clq3234567890abcdef123456')">
                📷 Raio-X
                <span class="wait-time">~5 min</span>
            </button>
        </div>
    </div>

    <div id="ticket-display" style="display: none;">
        <div class="ticket-card">
            <h1>Sua Senha</h1>
            <div class="ticket-number">04</div>
            <div class="queue-info">
                <p>Endocrinologia</p>
                <p>Posição: <span id="position">3º</span></p>
                <p>Tempo estimado: <span id="time">45 min</span></p>
            </div>
            <div class="status" id="status">Aguardando...</div>
        </div>
    </div>
</div>

<style>
.mobile-queue-interface {
    max-width: 400px;
    margin: 0 auto;
    padding: 20px;
    font-family: Arial, sans-serif;
}

.queue-btn {
    width: 100%;
    padding: 20px;
    margin: 10px 0;
    background: #2196F3;
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 18px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.ticket-card {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 30px;
    border-radius: 20px;
    text-align: center;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
}

.ticket-number {
    font-size: 72px;
    font-weight: bold;
    margin: 20px 0;
}

.status {
    padding: 10px 20px;
    background: rgba(255,255,255,0.2);
    border-radius: 20px;
    margin-top: 20px;
}
</style>
```

---

## 📺 **Passo 11: Painel TV para Sala de Espera**

### **11.1 Display Público**
```html
<!DOCTYPE html>
<html>
<head>
    <title>Centro Clínico São Paulo - Painel de Senhas</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
        }

        .queues-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            flex: 1;
        }

        .queue-panel {
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            padding: 30px;
            backdrop-filter: blur(10px);
        }

        .current-number {
            font-size: 120px;
            font-weight: bold;
            text-align: center;
            color: #FFD700;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }

        .queue-name {
            font-size: 36px;
            text-align: center;
            margin-bottom: 20px;
        }

        .waiting-numbers {
            display: flex;
            justify-content: center;
            gap: 15px;
            flex-wrap: wrap;
        }

        .waiting-number {
            background: rgba(255,255,255,0.2);
            padding: 10px 15px;
            border-radius: 10px;
            font-size: 24px;
        }

        .called-notification {
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #4CAF50;
            color: white;
            padding: 40px 60px;
            border-radius: 20px;
            font-size: 48px;
            text-align: center;
            z-index: 1000;
            animation: pulse 1s infinite;
            display: none;
        }

        @keyframes pulse {
            0% { transform: translate(-50%, -50%) scale(1); }
            50% { transform: translate(-50%, -50%) scale(1.05); }
            100% { transform: translate(-50%, -50%) scale(1); }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Centro Clínico São Paulo</h1>
        <p>Acompanhe sua senha nas telas abaixo</p>
    </div>

    <div class="queues-grid">
        <div class="queue-panel">
            <div class="queue-name">🩺 Endocrinologia</div>
            <div class="current-number" id="endo-current">02</div>
            <div class="waiting-numbers">
                <span class="waiting-number">03</span>
                <span class="waiting-number">04</span>
                <span class="waiting-number">05</span>
            </div>
        </div>

        <div class="queue-panel">
            <div class="queue-name">👶 Pediatria</div>
            <div class="current-number" id="pediatria-current">01</div>
            <div class="waiting-numbers">
                <span class="waiting-number">02</span>
                <span class="waiting-number">03</span>
            </div>
        </div>

        <div class="queue-panel">
            <div class="queue-name">📷 Raio-X</div>
            <div class="current-number" id="raiox-current">05</div>
            <div class="waiting-numbers">
                <span class="waiting-number">06</span>
            </div>
        </div>

        <div class="queue-panel">
            <div class="queue-name">👁️ Oftalmologia</div>
            <div class="current-number" id="oftalmo-current">03</div>
            <div class="waiting-numbers">
                <span class="waiting-number">04</span>
                <span class="waiting-number">05</span>
                <span class="waiting-number">06</span>
            </div>
        </div>
    </div>

    <div class="called-notification" id="notification">
        <div>🔔 SENHA CHAMADA</div>
        <div id="called-details">Número 04 - Endocrinologia</div>
    </div>

    <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
    <script>
        const socket = io('http://localhost:3001');

        // Escutar chamadas de tickets
        socket.on('ticket-called', (data) => {
            // Mostrar notificação de chamada
            showCalledNotification(data);
            
            // Atualizar número atual
            updateCurrentNumber(data.queueId, data.number);
            
            // Tocar som
            playCallSound();
        });

        // Escutar atualizações da fila
        socket.on('queue-update', (data) => {
            updateQueueDisplay(data);
        });

        function showCalledNotification(data) {
            const notification = document.getElementById('notification');
            const details = document.getElementById('called-details');
            
            details.textContent = `Número ${data.number} - ${data.queueName}`;
            notification.style.display = 'block';
            
            // Esconder após 10 segundos
            setTimeout(() => {
                notification.style.display = 'none';
            }, 10000);
        }

        function updateCurrentNumber(queueId, number) {
            const queueMap = {
                'clq1234567890abcdef123456': 'endo-current',
                'clq2234567890abcdef123456': 'pediatria-current',
                'clq3234567890abcdef123456': 'raiox-current',
                'clq4234567890abcdef123456': 'oftalmo-current'
            };
            
            const elementId = queueMap[queueId];
            if (elementId) {
                document.getElementById(elementId).textContent = 
                    number.toString().padStart(2, '0');
            }
        }

        function updateQueueDisplay(data) {
            // Atualizar números em espera para cada fila
            // Implementar lógica conforme necessário
        }

        function playCallSound() {
            // Som de campainha
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmEbBSaq2u7Ai0IAMgAC...');
            audio.play().catch(() => {}); // Ignorar erros de autoplay
        }
    </script>
</body>
</html>
```

---

## 🎯 **Resumo do Fluxo Completo**

### **📋 Checklist de Implementação**

**✅ 1. Setup Inicial**
- [ ] Criar Tenant (empresa)
- [ ] Criar Admin da empresa 
- [ ] Fazer login do Admin

**✅ 2. Configurar Filas**
- [ ] Criar filas conforme especialidades
- [ ] Configurar capacidade e tempo médio
- [ ] Definir tipos (GENERAL, PRIORITY, VIP)

**✅ 3. Interface do Cliente**
- [ ] QR Codes para cada fila
- [ ] App/PWA responsivo
- [ ] WebSocket para atualizações em tempo real

**✅ 4. Painel de Atendimento**
- [ ] Interface para chamar próximo
- [ ] Botões para rechamar/pular/completar
- [ ] Lista de espera em tempo real

**✅ 5. Painel TV Público**
- [ ] Display dos números atuais
- [ ] Notificações visuais de chamada
- [ ] Som de campainha

**✅ 6. Notificações**
- [ ] WebSocket configurado
- [ ] Push notifications (opcional)
- [ ] SMS/Email (opcional)

---

## 🚀 **Próximos Passos**

1. **📱 Criar PWA** para clientes
2. **📊 Dashboard** com estatísticas
3. **🔔 Push Notifications** via service worker
4. **📧 Notificações por email/SMS**
5. **📈 Analytics** de tempo de espera
6. **🎨 Customização** visual por tenant

**🎉 Pronto! Seu sistema de fila digital está completo e funcionando!**
