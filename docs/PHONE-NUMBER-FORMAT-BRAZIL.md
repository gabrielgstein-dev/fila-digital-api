# Formatação de Números de Telefone Brasileiros

## 📱 Formato E.164 para Brasil

O Twilio requer números no formato **E.164** internacional:
- Formato: `+55DDDNNNNNNNNN` (com código do país 55)
- Exemplo: `+5561982172963`

## 🔢 Formatos de Entrada Aceitos

A função `formatPhoneNumber` aceita e converte automaticamente:

### 1. Número com 9 dígitos (celular novo)
- Entrada: `61982172963` (11 dígitos: DDD + 9 + número)
- Saída: `5561982172963` ✅

### 2. Número com 8 dígitos (celular antigo)
- Entrada: `6182172963` (10 dígitos: DDD + número)
- Saída: `556182172963` ✅

### 3. Número já com código do país
- Entrada: `5561982172963` (13 dígitos)
- Saída: `5561982172963` ✅ (mantém como está)

### 4. Número com formatação
- Entrada: `(61) 98217-2963` ou `+55 61 98217-2963`
- Saída: `5561982172963` ✅ (remove formatação e adiciona 55 se necessário)

## ⚠️ Problema Comum: Número com 9 dígitos

**Cenário:** Número `61982172963` (11 dígitos com o 9)

**Solução:** A função agora detecta números de 8 a 11 dígitos e adiciona automaticamente o código do país `55`.

**Resultado:** `5561982172963` (formato correto para Twilio)

## 🧪 Exemplos de Teste

```typescript
// Número com 9 dígitos (celular novo)
formatPhoneNumber('61982172963')
// → '5561982172963' ✅

// Número com 8 dígitos (celular antigo)
formatPhoneNumber('6182172963')
// → '556182172963' ✅

// Número já formatado
formatPhoneNumber('+55 61 98217-2963')
// → '5561982172963' ✅

// Número com código do país
formatPhoneNumber('5561982172963')
// → '5561982172963' ✅
```

## 📋 Validação

A função valida:
- ✅ Remove todos os caracteres não numéricos
- ✅ Detecta se já tem código do país (55)
- ✅ Adiciona código do país se tiver 8-11 dígitos
- ✅ Mantém formato se já estiver correto

## 🔍 Debug

Se um número não estiver funcionando, verifique:

1. **Número de dígitos:**
   - Com código do país: deve ter 12 ou 13 dígitos
   - Sem código do país: deve ter 10 ou 11 dígitos

2. **Formato enviado ao Twilio:**
   - Deve ser: `whatsapp:+5561982172963`
   - Com prefixo `whatsapp:` e `+` no início

3. **Logs:**
   - Verifique os logs do servidor para ver o formato exato enviado
   - Procure por: `Sending WhatsApp to whatsapp:+...`

## ✅ Checklist

- [ ] Número tem 10 ou 11 dígitos (sem código do país)
- [ ] Número tem 12 ou 13 dígitos (com código do país)
- [ ] Formato enviado: `whatsapp:+55...`
- [ ] Número está registrado no WhatsApp
- [ ] Twilio WhatsApp está configurado corretamente

---

**Última atualização:** Janeiro 2025
