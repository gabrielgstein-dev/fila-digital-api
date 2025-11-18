# NVoiP WhatsApp Provider

Provider para envio de mensagens WhatsApp usando a API da NVoiP.

## Documentação Oficial

- **Documentação da API**: <https://nvoip.docs.apiary.io/>
- **Site**: <https://www.nvoip.com.br/>

## Configuração

### Variáveis de Ambiente

Adicione as seguintes variáveis de ambiente:

```bash
# URL base da API NVoiP (opcional, padrão: https://api.nvoip.com.br/v2)
NVOIP_BASE_URL=https://api.nvoip.com.br/v2

# Numbersip da NVoiP (obrigatório)
NVOIP_NUMBERSIP=your-numbersip

# User Token da NVoiP (obrigatório)
NVOIP_USER_TOKEN=your-user-token
```

### Como Obter as Credenciais

1. Crie uma conta no [NVoiP](https://www.nvoip.com.br/)
2. Acesse o painel administrativo
3. Vá até "Configurações" > "API"
4. Copie seu `Numbersip` (NVOIP_NUMBERSIP)
5. Copie seu `User Token` (NVOIP_USER_TOKEN)

## Endpoints Utilizados

### Envio de Mensagem Simples

```http
POST /whatsapp/send?numbersip={NVOIP_NUMBERSIP}&user_token={NVOIP_USER_TOKEN}
Content-Type: application/json

{
  "number": "5511999999999",
  "message": "Mensagem a ser enviada"
}
```

### Envio de Mensagem com Botões

```http
POST /whatsapp/send-button-list?numbersip={NVOIP_NUMBERSIP}&user_token={NVOIP_USER_TOKEN}
Content-Type: application/json

{
  "number": "5511999999999",
  "message": "Mensagem com botões",
  "buttons": [
    {
      "id": "button_id",
      "title": "Texto do Botão"
    }
  ]
}
```

## Formato de Número

O provider formata automaticamente os números de telefone:

- Remove caracteres não numéricos
- Adiciona código do país (55) se necessário
- Remove o sinal de "+" antes de enviar

Exemplos:

- `11999999999` → `5511999999999`
- `+5511999999999` → `5511999999999`
- `5511999999999` → `5511999999999`

## Uso

O provider é injetado automaticamente no `WhatsAppService`. Não é necessário usar diretamente.

### Exemplo de Uso Direto (não recomendado)

```typescript
import { NvoipProvider } from './providers/nvoip/nvoip.provider';

// Enviar mensagem simples
const result = await nvoipProvider.sendMessage({
  to: '11999999999',
  message: 'Olá! Esta é uma mensagem de teste.'
});

// Enviar mensagem com botões
const result = await nvoipProvider.sendButtonList(
  '11999999999',
  'Escolha uma opção:',
  [
    { id: 'option1', label: 'Opção 1' },
    { id: 'option2', label: 'Opção 2' }
  ]
);
```

## Diferenças do Z-API

| Aspecto | Z-API | NVoiP |
|---------|-------|-------|
| Autenticação | Instance ID + Token | Numbersip + User Token (query string) |
| URL Base | `https://api.z-api.io` | `https://api.nvoip.com.br/v2` |
| Endpoint Send | `/instances/{id}/token/{token}/send-text` | `/whatsapp/send?numbersip={...}&user_token={...}` |
| Endpoint Buttons | `/instances/{id}/token/{token}/send-button-list` | `/whatsapp/send-button-list?numbersip={...}&user_token={...}` |
| Headers | `Client-Token` (opcional) | Query string parameters |

## Troubleshooting

### Erro: "NVoiP not configured"

Verifique se as variáveis `NVOIP_NUMBERSIP` e `NVOIP_USER_TOKEN` estão configuradas corretamente.

### Erro: "401 Unauthorized"

Verifique se o `NVOIP_NUMBERSIP` e `NVOIP_USER_TOKEN` estão corretos e válidos.

### Erro: "400 Bad Request"

Verifique:

- Formato do número de telefone (deve ser apenas números, com código do país)
- Mensagem não está vazia
- Botões estão no formato correto (para sendButtonList)

## Logs

O provider gera logs detalhados:

- `DEBUG`: URLs, headers, request/response bodies
- `LOG`: Sucesso no envio (com Message ID)
- `WARN`: Configuração não encontrada
- `ERROR`: Erros de envio

Ative logs de debug para ver detalhes completos das requisições.
