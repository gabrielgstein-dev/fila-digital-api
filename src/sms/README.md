# SMS Module (Twilio) - DESATIVADO

## Status: ❌ DESATIVADO

Este módulo está **desativado** mas mantido no código para facilitar ativação futura se necessário.

## Motivo da Desativação

O sistema utiliza **WhatsApp** como canal principal de notificação. SMS via Twilio foi desativado para:
- Reduzir custos operacionais
- Simplificar integrações
- Focar em um canal mais efetivo (WhatsApp)

## Implementação Atual

O `SmsService` está configurado com:
- `enabled: false` - Serviço desativado
- Métodos retornam `{ success: false, error: 'SMS service not available' }`
- Controller mantido mas não produz efeito real

## Como Reativar no Futuro

Se precisar reativar SMS via Twilio:

### 1. Instalar Dependência

```bash
pnpm add twilio
pnpm add -D @types/twilio
```

### 2. Configurar Variáveis de Ambiente

```env
# .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+5511999999999
```

### 3. Atualizar SmsService

```typescript
import * as twilio from 'twilio';

constructor(private readonly configService: ConfigService) {
  const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
  const authToken = this.configService.get('TWILIO_AUTH_TOKEN');
  
  if (accountSid && authToken) {
    this.twilioClient = twilio(accountSid, authToken);
    this.enabled = true;
    this.logger.log('SMS service enabled via Twilio');
  } else {
    this.enabled = false;
    this.logger.log('SMS service disabled');
  }
}

async sendSms(options: SendSmsOptions): Promise<SmsResponse> {
  if (!this.enabled || !this.twilioClient) {
    return { success: false, error: 'SMS service not available' };
  }

  try {
    const message = await this.twilioClient.messages.create({
      body: options.message,
      to: options.to,
      from: options.from || this.configService.get('TWILIO_PHONE_NUMBER'),
    });

    return {
      success: true,
      messageSid: message.sid,
    };
  } catch (error) {
    this.logger.error(`Failed to send SMS: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

### 4. Importar no AppModule

```typescript
// src/app.module.ts
import { SmsModule } from './sms/sms.module';

@Module({
  imports: [
    // ... outros módulos
    SmsModule, // Adicionar aqui
  ],
})
export class AppModule {}
```

### 5. Usar no Código

```typescript
// Exemplo de uso
constructor(private smsService: SmsService) {}

async sendNotification() {
  const result = await this.smsService.sendSms({
    to: '+5511999998888',
    message: 'Sua senha foi chamada!',
  });
  
  if (result.success) {
    console.log('SMS enviado:', result.messageSid);
  }
}
```

## Estrutura de Arquivos

```
src/sms/
├── README.md              # Este arquivo
├── sms.module.ts          # Módulo NestJS
├── sms.service.ts         # Service com lógica (desativado)
└── sms.controller.ts      # Controller de teste (desativado)
```

## Notificações Ativas

Atualmente o sistema usa:
- ✅ **WhatsApp** - Via Meta API (`src/whatsapp/`)
- ✅ **Telegram** - Via Bot API (`src/telegram/`)
- ❌ **SMS** - Desativado (este módulo)

---

**Última atualização:** 26/01/2026
**Status:** Desativado mas mantido para uso futuro
