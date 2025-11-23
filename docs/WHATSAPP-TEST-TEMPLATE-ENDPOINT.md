# Teste de Template WhatsApp - Endpoint

## 📍 Endpoint

**URL:** `POST /api/v1/whatsapp/test-template`
**Autenticação:** Não requer (público)

## 🔧 Exemplo cURL

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test-template \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "templateName": "queue_info",
    "language": "pt_BR",
    "parameters": [
      { "type": "text", "text": "Atendimento Geral" },
      { "type": "text", "text": "A123" },
      { "type": "text", "text": "15 minutos" },
      { "type": "text", "text": "2" }
    ]
  }'
```

## 📦 Collection Postman

Importe o JSON abaixo no Postman:

```json

```

## 📝 Parâmetros

### Request Body

```json
{
  "phoneNumber": "5511999999999",      // Obrigatório: Número no formato internacional
  "templateName": "queue_info",         // Obrigatório: Nome do template aprovado
  "language": "pt_BR",                  // Obrigatório: Código do idioma
  "parameters": [                        // Obrigatório: Array de parâmetros
    { "type": "text", "text": "Atendimento Geral" },
    { "type": "text", "text": "A123" },
    { "type": "text", "text": "15 minutos" },
    { "type": "text", "text": "2" }
  ]
}
```

## ✅ Resposta de Sucesso

```json
{
  "success": true,
  "messageSid": "wamid.HBgNNTUxMTk5OTk5OTk5ORUCABIYFjNFQjA4QkI3M0Y4RjY1QzE2RjU4AA=="
}
```

## ❌ Resposta de Erro

```json
{
  "success": false,
  "error": "Request failed with status code 401",
  "details": {
    "status": 401,
    "moreInfo": "Unauthorized",
    "fullResponse": {
      "error": {
        "message": "Invalid OAuth access token.",
        "type": "OAuthException",
        "code": 190
      }
    },
    "message": "Request failed with status code 401"
  }
}
```

## 🔍 Exemplos de Templates

### Template: queue_info

```json
{
  "phoneNumber": "5511999999999",
  "templateName": "queue_info",
  "language": "pt_BR",
  "parameters": [
    { "type": "text", "text": "Atendimento Geral" },
    { "type": "text", "text": "A123" },
    { "type": "text", "text": "15 minutos" },
    { "type": "text", "text": "2" }
  ]
}
```

### Template: atualizacao_fila

```json
{
  "phoneNumber": "5511999999999",
  "templateName": "atualizacao_fila",
  "language": "pt_BR",
  "parameters": [
    { "type": "text", "text": "A123" },
    { "type": "text", "text": "Atendimento Geral" },
    { "type": "text", "text": "2" },
    { "type": "text", "text": "1" },
    { "type": "text", "text": "5 minutos" }
  ]
}
```

## 🚀 Como Importar no Postman

1. Abra o Postman
2. Clique em **Import** (canto superior esquerdo)
3. Cole o JSON da collection acima
4. Clique em **Import**
5. Ajuste a variável `baseUrl` se necessário
6. Execute a requisição!

## 📌 Notas Importantes

- O template deve estar **aprovado** no Meta Business Manager
- O template `queue_info` deve estar configurado em **Português (pt_BR)**
  - Ver documentação completa: [WHATSAPP-TEMPLATE-QUEUE-INFO-PTBR.md](./WHATSAPP-TEMPLATE-QUEUE-INFO-PTBR.md)
- O número de telefone deve estar no formato internacional (sem +)
- Todos os parâmetros do template devem ser fornecidos
- O idioma deve corresponder ao idioma do template aprovado
