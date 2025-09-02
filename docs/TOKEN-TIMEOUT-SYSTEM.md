# Sistema de Timeout de Token - NextAuth + Igniter.js

## 🎯 **SIM! Você pode apresentar timeout exatamente na hora que o token expirar**

O sistema implementado monitora o token JWT em tempo real e apresenta notificações precisas baseadas na expiração.

## 🚀 **Como Funciona**

### 1. **Monitoramento em Tempo Real**
```typescript
// src/hooks/useTokenTimeout.ts
export function useTokenTimeout(options: TokenTimeoutOptions = {}) {
  const { data: session } = useSession();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isExpired, setIsExpired] = useState(false);
  const [isExpiring, setIsExpiring] = useState(false);

  // Calcula tempo restante decodificando o JWT
  const calculateTimeLeft = useCallback(() => {
    const tokenPayload = JSON.parse(atob(session.user.accessToken.split('.')[1]));
    const expirationTime = tokenPayload.exp * 1000;
    const currentTime = Date.now();
    return Math.max(0, Math.floor((expirationTime - currentTime) / 1000));
  }, [session?.user?.accessToken]);

  // Verifica a cada segundo
  useEffect(() => {
    const interval = setInterval(() => {
      const timeLeftSeconds = calculateTimeLeft();
      setTimeLeft(timeLeftSeconds);

      if (timeLeftSeconds <= 0) {
        setIsExpired(true);
        onTokenExpired?.();
      } else if (timeLeftSeconds <= warningThreshold) {
        setIsExpiring(true);
        onTokenExpiring?.(timeLeftSeconds);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [calculateTimeLeft, warningThreshold]);
}
```

### 2. **Interface de Usuário**

#### **Barra de Status**
```typescript
// src/components/TokenStatusBar.tsx
export function TokenStatusBar() {
  const { timeLeft, isExpiring, formatTimeLeft } = useTokenTimeout({
    warningThreshold: 300, // 5 minutos
  });

  return (
    <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 z-40">
      <div className="flex items-center justify-between">
        <span>Sua sessão expirará em breve</span>
        <div className="font-bold">{formatTimeLeft(timeLeft)}</div>
      </div>
    </div>
  );
}
```

#### **Modal de Timeout**
```typescript
// src/components/TokenTimeoutModal.tsx
export function TokenTimeoutModal({ timeLeft, onExtend, onLogout }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h3 className="text-lg font-medium mb-2">Sessão Expirando</h3>
        <div className="text-2xl font-bold text-red-600 mb-6">
          {formatTimeLeft(timeLeft)}
        </div>
        <div className="flex space-x-3">
          <button onClick={onExtend}>Estender Sessão</button>
          <button onClick={onLogout}>Fazer Logout</button>
        </div>
      </div>
    </div>
  );
}
```

### 3. **Provider Global**
```typescript
// src/providers/TokenTimeoutProvider.tsx
export function TokenTimeoutProvider({ children }) {
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);

  const handleTokenExpiring = useCallback((secondsLeft: number) => {
    // Mostrar modal quando restam 2 minutos
    if (secondsLeft <= 120 && !showTimeoutModal) {
      setShowTimeoutModal(true);
    }
  }, [showTimeoutModal]);

  const handleTokenExpired = useCallback(() => {
    setShowTimeoutModal(false);
    signOut({ callbackUrl: '/login' });
  }, []);

  // Monitora o token automaticamente
  useTokenTimeout({
    onTokenExpired: handleTokenExpired,
    onTokenExpiring: handleTokenExpiring,
    warningThreshold: 300, // 5 minutos
    checkInterval: 1000, // 1 segundo
  });

  return (
    <TokenTimeoutContext.Provider value={{ showTimeoutModal, extendSession, logout }}>
      {children}
      <TokenTimeoutModal isOpen={showTimeoutModal} />
    </TokenTimeoutContext.Provider>
  );
}
```

## 🎯 **Funcionalidades Implementadas**

### 1. **Monitoramento Preciso**
- ✅ **Decodificação JWT**: Extrai `exp` do token para calcular expiração exata
- ✅ **Verificação contínua**: Checa a cada segundo
- ✅ **Cálculo em tempo real**: Tempo restante atualizado dinamicamente

### 2. **Notificações Inteligentes**
- ✅ **Barra de status**: Aparece 5 minutos antes da expiração
- ✅ **Modal de aviso**: Aparece 2 minutos antes da expiração
- ✅ **Countdown visual**: Mostra tempo restante em tempo real

### 3. **Ações do Usuário**
- ✅ **Estender sessão**: Botão para renovar token
- ✅ **Logout manual**: Opção para sair antes da expiração
- ✅ **Logout automático**: Redireciona quando token expira

### 4. **Gerenciamento de Token**
```typescript
// src/lib/tokenManager.ts
export class TokenManager {
  // Verifica se token está expirado
  isTokenExpired(token: string): boolean {
    const payload = this.decodeToken(token);
    const expirationTime = payload.exp * 1000;
    return Date.now() >= expirationTime;
  }

  // Calcula tempo até expiração
  getTimeUntilExpiration(token: string): number {
    const payload = this.decodeToken(token);
    const expirationTime = payload.exp * 1000;
    return Math.max(0, Math.floor((expirationTime - Date.now()) / 1000));
  }

  // Renova token automaticamente
  async refreshAccessToken(refreshToken: string): Promise<string> {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    });
    return response.json().accessToken;
  }
}
```

## 🚀 **Como Usar**

### 1. **Setup Automático**
```bash
# Executar script de configuração
./scripts/setup-nextauth-igniter.sh

# Os arquivos de timeout serão copiados automaticamente
```

### 2. **Implementação no Layout**
```typescript
// src/app/layout.tsx
import { TokenTimeoutProvider } from '@/providers/TokenTimeoutProvider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <SessionProvider>
          <TokenTimeoutProvider>
            {children}
          </TokenTimeoutProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
```

### 3. **Uso em Componentes**
```typescript
// src/components/Dashboard.tsx
import { useTokenTimeout } from '@/hooks/useTokenTimeout';

export function Dashboard() {
  const { timeLeft, isExpiring, formatTimeLeft } = useTokenTimeout({
    warningThreshold: 300, // 5 minutos
    onTokenExpired: () => {
      console.log('Token expirado!');
    },
    onTokenExpiring: (secondsLeft) => {
      console.log(`Token expirando em ${secondsLeft} segundos`);
    },
  });

  return (
    <div>
      {isExpiring && (
        <div className="bg-yellow-100 p-4">
          ⚠️ Sessão expirando em: {formatTimeLeft(timeLeft)}
        </div>
      )}
      {/* Resto do dashboard */}
    </div>
  );
}
```

## 🎯 **Configurações Personalizáveis**

### 1. **Thresholds de Aviso**
```typescript
const { timeLeft, isExpiring } = useTokenTimeout({
  warningThreshold: 300, // 5 minutos antes
  checkInterval: 1000,   // Verifica a cada segundo
});
```

### 2. **Callbacks Personalizados**
```typescript
const { timeLeft } = useTokenTimeout({
  onTokenExpired: () => {
    // Ação quando token expira
    signOut({ callbackUrl: '/login' });
  },
  onTokenExpiring: (secondsLeft) => {
    // Ação quando está próximo da expiração
    if (secondsLeft <= 60) {
      showCriticalWarning();
    }
  },
});
```

### 3. **Formatação de Tempo**
```typescript
const { formatTimeLeft } = useTokenTimeout();

// Exemplos de saída:
formatTimeLeft(3661); // "1h 1m 1s"
formatTimeLeft(301);  // "5m 1s"
formatTimeLeft(45);   // "45s"
```

## 🎉 **Benefícios**

### 1. **Precisão**
- ✅ **Tempo exato**: Baseado na expiração real do JWT
- ✅ **Atualização contínua**: Countdown em tempo real
- ✅ **Sem delays**: Verificação a cada segundo

### 2. **Experiência do Usuário**
- ✅ **Avisos progressivos**: Barra → Modal → Logout
- ✅ **Ações claras**: Estender ou sair
- ✅ **Interface intuitiva**: Countdown visual

### 3. **Segurança**
- ✅ **Logout automático**: Quando token expira
- ✅ **Renovação opcional**: Usuário pode estender
- ✅ **Proteção de dados**: Sessão inválida é encerrada

### 4. **Flexibilidade**
- ✅ **Configurável**: Thresholds e callbacks personalizáveis
- ✅ **Reutilizável**: Hooks e componentes modulares
- ✅ **Integrável**: Funciona com NextAuth + Igniter.js

## 📊 **Exemplo de Fluxo**

```
Token válido (30min restantes)
    ↓
Token próximo da expiração (5min restantes)
    ↓
Barra de status aparece
    ↓
Token muito próximo (2min restantes)
    ↓
Modal de timeout aparece
    ↓
Usuário escolhe:
    ├── Estender sessão → Token renovado
    └── Fazer logout → Redirecionamento
    ↓
Se não escolher → Logout automático
```

## 🚀 **Resultado Final**

**SIM! O sistema apresenta timeout exatamente na hora que o token expira, com:**

1. ✅ **Monitoramento preciso** do JWT
2. ✅ **Notificações progressivas** (barra → modal)
3. ✅ **Countdown em tempo real**
4. ✅ **Ações do usuário** (estender/logout)
5. ✅ **Logout automático** na expiração
6. ✅ **Integração completa** com NextAuth + Igniter.js

**A experiência é fluida, segura e precisa!** 🎯
