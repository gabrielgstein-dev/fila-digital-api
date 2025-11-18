# 🔄 Guia de Reconexão - Z-API

## 🎯 Problema: Instância Desconectada

Se a instância está mostrando como **desconectada**, você precisa reconectá-la escaneando o QR Code novamente.

## 📋 Passo a Passo para Reconectar

### Método 1: Via Painel Web (Recomendado)

1. **Acesse o painel do Z-API:**
   - https://www.z-api.io/
   - Faça login na sua conta

2. **Vá em "Instâncias Web":**
   - No menu lateral, clique em **"Instâncias Web"** ou **"Instâncias"**

3. **Encontre sua instância:**
   - Procure pela instância com ID: `3EA623FA49D6F1D85406766235F08398`
   - Ou pelo nome que você deu à instância

4. **Reconectar:**
   - Clique na instância
   - Procure pelo botão **"Reconectar"**, **"Pegar QR Code"** ou **"Conectar"**
   - Um QR Code será exibido

5. **Escanear QR Code:**
   - Abra o **WhatsApp** no seu celular
   - Vá em **Configurações** > **Aparelhos conectados** > **Conectar um aparelho**
   - Escaneie o QR Code exibido no painel
   - Aguarde a conexão ser estabelecida

6. **Verificar Status:**
   - O status deve mudar de **🔴 Desconectado** para **🟢 Conectado**
   - Isso pode levar alguns segundos

### Método 2: Via API (Programático)

Se preferir, você pode usar a API do Z-API para obter o QR Code:

```bash
curl -X GET "https://api.z-api.io/instances/3EA623FA49D6F1D85406766235F08398/token/ED101775106FA5FD2B1C3F89/qrcode" \
  -H "Client-Token: SEU_ACCOUNT_TOKEN"
```

Isso retornará o QR Code em base64 ou uma URL para o QR Code.

## ⚠️ Importante

### Por que a instância desconecta?

1. **WhatsApp desconectou** - Se você desconectou manualmente no WhatsApp
2. **Reinício do servidor** - Se o servidor do Z-API foi reiniciado
3. **Inatividade prolongada** - Se ficou muito tempo sem uso
4. **Problemas de conexão** - Problemas de rede ou servidor

### Como evitar desconexões?

1. **Mantenha o WhatsApp ativo** - Não desconecte manualmente
2. **Use sempre a mesma instância** - Não crie múltiplas instâncias
3. **Monitore o status** - Verifique periodicamente se está conectado
4. **Configure webhooks** - Para receber notificações de desconexão

## 🔍 Verificar Status da Instância

### Via Painel Web

1. Acesse o painel do Z-API
2. Vá em "Instâncias Web"
3. Veja o status da instância:
   - 🟢 **Conectado** - Tudo funcionando
   - 🟡 **Conectando** - Aguardando conexão
   - 🔴 **Desconectado** - Precisa reconectar

### Via API

```bash
curl -X GET "https://api.z-api.io/instances/3EA623FA49D6F1D85406766235F08398/token/ED101775106FA5FD2B1C3F89/status" \
  -H "Client-Token: SEU_ACCOUNT_TOKEN"
```

## 🧪 Após Reconectar

Após reconectar, teste novamente:

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test-simple \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "556182172963",
    "message": "Teste após reconectar"
  }'
```

A mensagem deve chegar agora!

## 📝 Checklist de Reconexão

- [ ] Acessou o painel do Z-API
- [ ] Encontrou a instância correta
- [ ] Clicou em "Reconectar" ou "Pegar QR Code"
- [ ] Escaneou o QR Code com WhatsApp
- [ ] Status mudou para "Conectado"
- [ ] Testou envio de mensagem
- [ ] Mensagem chegou no WhatsApp

## 🆘 Se não conseguir reconectar

1. **Tente criar uma nova instância** (se necessário)
2. **Verifique se o WhatsApp está atualizado**
3. **Tente de outro dispositivo** (outro celular)
4. **Entre em contato com suporte Z-API**

---

**Última atualização:** Janeiro 2025
