# 🔐 Guia de Gerenciamento de Token e Sessão

## 📋 **Estratégia Híbrida: Backend + Frontend**

### 🎯 **Responsabilidades**

#### **Backend (API) - Controle Principal:**
- ✅ Define tempo de expiração do token
- ✅ Valida tokens em cada requisição
- ✅ Gera novos tokens (refresh)
- ✅ Revoga tokens quando necessário
- ✅ Fornece informações sobre status do token

#### **Frontend - Experiência do Usuário:**
- 🔄 Monitora expiração e renova automaticamente
- ⚠️ Exibe avisos de sessão expirando
- 🚪 Faz logout gracioso quando token expira
- 📱 Persiste tokens de forma segura

---

## 🛠️ **Endpoints Disponíveis**

### **1. Verificar Status do Token**
```http
GET /dashboard/token-status
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "status": "valid", // ou "expiring_soon"
  "token": "eyJ...",
  "expiresAt": "2024-01-15T10:30:00Z",
  "expiresIn": 1800, // segundos
  "shouldRefresh": false,
  "timeToExpire": "30min",
  "recommendations": {
    "should_refresh": false,
    "action": "Token válido, nenhuma ação necessária"
  }
}
```

### **2. Renovar Token**
```http
POST /dashboard/refresh-token
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "message": "Token renovado com sucesso",
  "access_token": "eyJnew...",
  "expires_in": 3600,
  "refreshed_at": "2024-01-15T09:45:00Z"
}
```

### **3. Informações Completas da Sessão**
```http
GET /dashboard/session-info
Authorization: Bearer <token>
```

**Resposta:**
```json
{
  "userId": "user123",
  "tenantId": "tenant456",
  "role": "admin",
  "tokenInfo": {
    "expiresAt": "2024-01-15T10:30:00Z",
    "expiresIn": 1800,
    "shouldRefresh": false,
    "timeToExpire": "30min"
  },
  "sessionStart": "2024-01-15T08:00:00Z",
  "lastActivity": "2024-01-15T09:45:00Z",
  "warnings": {
    "tokenExpiring": false,
    "timeRemaining": "30min"
  }
}
```

---

## 💻 **Implementação Frontend (Exemplo)**

### **1. Service de Token (TypeScript/JavaScript)**

```typescript
class TokenService {
  private static readonly REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutos
  private refreshTimer?: NodeJS.Timeout;

  constructor(private apiClient: ApiClient) {
    this.startTokenMonitoring();
  }

  // Inicia monitoramento automático
  private startTokenMonitoring() {
    this.refreshTimer = setInterval(async () => {
      await this.checkAndRefreshToken();
    }, 60000); // Verifica a cada minuto
  }

  // Verifica se precisa renovar o token
  private async checkAndRefreshToken() {
    try {
      const status = await this.apiClient.get('/dashboard/token-status');
      
      if (status.shouldRefresh) {
        await this.refreshToken();
      }
      
      // Mostrar aviso se está expirando em breve
      if (status.shouldRefresh && !this.isWarningShown) {
        this.showExpirationWarning(status.timeToExpire);
      }
    } catch (error) {
      // Token inválido ou expirado - fazer logout
      this.handleTokenExpired();
    }
  }

  // Renova o token
  async refreshToken(): Promise<string> {
    try {
      const response = await this.apiClient.post('/dashboard/refresh-token');
      
      if (response.access_token) {
        // Salvar novo token
        localStorage.setItem('access_token', response.access_token);
        this.apiClient.setAuthToken(response.access_token);
        
        console.log('✅ Token renovado automaticamente');
        return response.access_token;
      }
    } catch (error) {
      console.error('❌ Erro ao renovar token:', error);
      this.handleTokenExpired();
      throw error;
    }
  }

  // Exibe aviso de expiração
  private showExpirationWarning(timeRemaining: string) {
    // Implementar notificação na UI
    this.showNotification({
      type: 'warning',
      title: 'Sessão Expirando',
      message: `Sua sessão expirará em ${timeRemaining}. Clique para renovar.`,
      action: () => this.refreshToken(),
      duration: 30000 // 30 segundos
    });
  }

  // Manipula token expirado
  private handleTokenExpired() {
    // Limpar tokens
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    
    // Redirecionar para login
    window.location.href = '/login?reason=token_expired';
    
    // Mostrar mensagem
    this.showNotification({
      type: 'error',
      title: 'Sessão Expirada',
      message: 'Sua sessão expirou. Faça login novamente.',
    });
  }

  // Para o monitoramento (ao fazer logout)
  stopMonitoring() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
  }
}
```

### **2. Hook React (se usando React)**

```typescript
import { useEffect, useState } from 'react';

export function useTokenManager() {
  const [tokenStatus, setTokenStatus] = useState<'valid' | 'expiring' | 'expired'>('valid');
  const [timeRemaining, setTimeRemaining] = useState<string>('');

  useEffect(() => {
    const checkToken = async () => {
      try {
        const response = await fetch('/api/dashboard/token-status', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          }
        });
        
        const data = await response.json();
        
        setTokenStatus(data.shouldRefresh ? 'expiring' : 'valid');
        setTimeRemaining(data.timeToExpire);
        
        // Auto-refresh se necessário
        if (data.shouldRefresh) {
          await refreshToken();
        }
      } catch (error) {
        setTokenStatus('expired');
        handleLogout();
      }
    };

    // Verificar imediatamente e depois a cada minuto
    checkToken();
    const interval = setInterval(checkToken, 60000);

    return () => clearInterval(interval);
  }, []);

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/dashboard/refresh-token', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('access_token')}`
        }
      });
      
      const data = await response.json();
      localStorage.setItem('access_token', data.access_token);
      setTokenStatus('valid');
    } catch (error) {
      handleLogout();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    window.location.href = '/login';
  };

  return {
    tokenStatus,
    timeRemaining,
    refreshToken,
    handleLogout
  };
}
```

### **3. Componente de Aviso (React)**

```typescript
import React from 'react';
import { useTokenManager } from './useTokenManager';

export function TokenStatusWarning() {
  const { tokenStatus, timeRemaining, refreshToken } = useTokenManager();

  if (tokenStatus !== 'expiring') return null;

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 z-50">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">
            ⚠️ Sua sessão expirará em {timeRemaining}
          </span>
        </div>
        <button
          onClick={refreshToken}
          className="bg-yellow-600 hover:bg-yellow-700 px-3 py-1 rounded text-sm font-medium"
        >
          Renovar Sessão
        </button>
      </div>
    </div>
  );
}
```

---

## ⚙️ **Configurações Recomendadas**

### **Tempos de Expiração:**
- 🔄 **Token Principal**: 1 hora (3600s)
- ⚠️ **Aviso de Renovação**: 5 minutos antes da expiração
- 🔄 **Refresh Token**: 7 dias (se implementado)
- 📱 **Verificação Automática**: A cada 1 minuto

### **Estratégias por Tipo de App:**
- **📱 App Mobile**: Refresh automático silencioso
- **💻 Web App**: Avisos visuais + refresh manual/automático
- **🖥️ Desktop App**: Notificações do sistema + auto-refresh

---

## 🚨 **Cenários de Tratamento**

### **1. Token Expirando (5 min restantes):**
- ✅ Mostrar aviso na interface
- ✅ Oferecer botão de renovação
- ✅ Auto-renovar em background (opcional)

### **2. Token Expirado:**
- ❌ Interceptar erro 401
- 🚪 Redirecionar para login
- 📝 Mostrar mensagem explicativa
- 🧹 Limpar dados locais

### **3. Erro de Renovação:**
- ❌ Token refresh falhou
- 🚪 Forçar novo login
- 📱 Notificar usuário do problema

### **4. Múltiplas Abas/Janelas:**
- 🔄 Sincronizar tokens entre abas
- 📢 Broadcast de renovação
- 🎯 Evitar múltiplas renovações simultâneas

---

## 🔒 **Segurança**

### **Armazenamento:**
- ✅ **localStorage**: Para web apps (aceitável para JWT)
- ✅ **httpOnly Cookies**: Mais seguro (requer configuração CORS)
- ✅ **Secure Storage**: Para apps móveis
- ❌ **sessionStorage**: Perde dados ao fechar aba

### **Transmissão:**
- ✅ Sempre HTTPS em produção
- ✅ Header `Authorization: Bearer <token>`
- ❌ Nunca em query parameters
- ❌ Nunca em URLs

---

## 📊 **Monitoramento**

O backend já fornece métricas através dos endpoints. Monitore:
- 📈 Taxa de renovações automáticas
- ⏱️ Tempo médio de sessão
- 🚪 Causas de logout (expiração vs manual)
- 🔄 Frequência de refresh de tokens

---

## ✅ **Resumo da Melhor Prática**

1. **🎯 Backend controla**: Tempo de vida, validação, renovação
2. **💻 Frontend monitora**: Status do token, experiência do usuário
3. **🔄 Renovação automática**: 5 minutos antes da expiração
4. **⚠️ Avisos visuais**: Notificar usuário sobre expiração
5. **🚪 Logout gracioso**: Redirecionar com mensagem clara
6. **🔒 Armazenamento seguro**: localStorage ou httpOnly cookies
7. **📊 Monitoramento**: Métricas de sessão e renovação

Esta estratégia oferece **segurança robusta** com **excelente experiência do usuário**! 🚀
