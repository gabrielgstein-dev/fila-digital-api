# 📘 Guia Completo de Configuração - Z-API

## 🎯 Visão Geral

Este guia mostra passo a passo como configurar o envio de mensagens WhatsApp usando Z-API no projeto Fila API.

## 📋 Passo 1: Criar Conta no Z-API

1. Acesse: https://www.z-api.io/
2. Clique em **"Criar Conta"** ou **"Cadastre-se"**
3. Preencha os dados:
   - Nome
   - Email
   - Senha
4. Confirme seu email (se solicitado)

## 📋 Passo 2: Criar Instância no Z-API

1. **Faça login** no painel do Z-API
2. No menu lateral, clique em **"Instâncias Web"** ou **"Instâncias"**
3. Clique no botão **"Criar Nova Instância"** ou **"+"**
4. Dê um nome para sua instância (ex: "Fila Digital")
5. Escolha o tipo: **"Instância Web"**
6. Clique em **"Criar"**

## 📋 Passo 3: Conectar WhatsApp

1. Após criar a instância, você verá um **QR Code**
2. Abra o **WhatsApp** no seu celular
3. Vá em **Configurações > Aparelhos conectados > Conectar um aparelho**
4. Escaneie o **QR Code** exibido no painel do Z-API
5. Aguarde a conexão ser estabelecida (status mudará para "Conectado")

## 📋 Passo 4: Obter Credenciais

Após conectar o WhatsApp, você precisará coletar 3 credenciais:

### 4.1. Instance ID

1. Na página da instância, você verá o **ID da Instância**
2. Copie esse ID (geralmente um número ou string)
3. Exemplo: `3CA1234567890ABCDEF`

### 4.2. Instance Token

1. Na mesma página da instância, procure por **"Token da Instância"** ou **"Token"**
2. Clique em **"Mostrar"** ou **"Copiar"** para ver o token
3. Copie o token completo
4. Exemplo: `ABC123XYZ789DEF456GHI012JKL345`

### 4.3. Account Token (Token de Segurança)

1. No menu lateral, vá em **"Segurança"** ou **"Configurações"**
2. Procure por **"Token de Segurança da Conta"** ou **"Client Token"**
3. Clique em **"Gerar"** ou **"Mostrar"** (se já existir)
4. Copie o token completo
5. Exemplo: `SECRET1234567890ABCDEFGHIJKLMNOP`

> **Nota:** O Account Token é opcional, mas **altamente recomendado** para segurança.

## 📋 Passo 5: Configurar Variáveis de Ambiente

### 5.1. Arquivo `.env` (Desenvolvimento Local)

Crie ou edite o arquivo `.env` na raiz do projeto:

```bash
# Z-API Configuration
ZAPI_BASE_URL=https://api.z-api.io
ZAPI_INSTANCE_ID=3CA1234567890ABCDEF
ZAPI_INSTANCE_TOKEN=ABC123XYZ789DEF456GHI012JKL345
ZAPI_ACCOUNT_TOKEN=SECRET1234567890ABCDEFGHIJKLMNOP
```

### 5.2. Render / Cloud Run (Produção)

Adicione as variáveis de ambiente no seu serviço:

#### Via Render:
1. Acesse seu serviço no Render
2. Vá em **"Environment"**
3. Adicione as variáveis:
   - `ZAPI_BASE_URL` = `https://api.z-api.io`
   - `ZAPI_INSTANCE_ID` = `seu-instance-id`
   - `ZAPI_INSTANCE_TOKEN` = `seu-instance-token`
   - `ZAPI_ACCOUNT_TOKEN` = `seu-account-token`

#### Via Cloud Run:
```bash
gcloud run services update fila-api \
  --region us-central1 \
  --update-env-vars "ZAPI_BASE_URL=https://api.z-api.io" \
  --update-env-vars "ZAPI_INSTANCE_ID=seu-instance-id" \
  --update-env-vars "ZAPI_INSTANCE_TOKEN=seu-instance-token" \
  --update-secrets "ZAPI_ACCOUNT_TOKEN=zapi-account-token:latest"
```

Ou via GitHub Secrets (se usar GitHub Actions):
- `ZAPI_INSTANCE_ID`
- `ZAPI_INSTANCE_TOKEN`
- `ZAPI_ACCOUNT_TOKEN`

## 📋 Passo 6: Verificar Configuração

### 6.1. Verificar Status

```bash
curl http://localhost:3001/api/v1/whatsapp/status
```

Resposta esperada:
```json
{
  "configured": true,
  "message": "Z-API está configurado e pronto para uso"
}
```

### 6.2. Testar Envio de Mensagem

```bash
curl -X POST http://localhost:3001/api/v1/whatsapp/test \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "5511999999999",
    "tenantName": "Empresa Teste",
    "ticketToken": "A001"
  }'
```

Resposta esperada:
```json
{
  "success": true,
  "messageSid": "mensagem-id-aqui"
}
```

## 📋 Passo 7: Testar no Fluxo Real

### 7.1. Criar um Ticket

```bash
curl -X POST http://localhost:3001/api/v1/queues/{queueId}/tickets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "clientName": "João Silva",
    "clientPhone": "5511999999999",
    "priority": 1
  }'
```

### 7.2. Verificar Mensagem

O cliente deve receber uma mensagem WhatsApp com:
- ✅ Confirmação de entrada na fila
- ✅ Nome da empresa
- ✅ Senha do ticket
- ✅ Posição na fila
- ✅ Tempo estimado
- ✅ Link para acompanhar

## 🔧 Formato do Número de Telefone

O Z-API espera números no formato:
- **Sem o sinal `+`**
- **Apenas números**
- **Com código do país** (55 para Brasil)

Exemplos:
- ✅ `5511999999999` (correto)
- ✅ `5511982172963` (correto)
- ❌ `+5511999999999` (não use +)
- ❌ `11999999999` (falta código do país)

O código já formata automaticamente, mas certifique-se de enviar números válidos.

## 🛠️ Troubleshooting

### Erro: "Z-API not configured"

**Causa:** Variáveis de ambiente não configuradas

**Solução:**
1. Verifique se todas as variáveis estão no `.env`
2. Reinicie a aplicação
3. Verifique se os nomes das variáveis estão corretos

### Erro: "Instance not found"

**Causa:** Instance ID incorreto

**Solução:**
1. Verifique o `ZAPI_INSTANCE_ID` no painel do Z-API
2. Certifique-se de copiar o ID completo
3. Verifique se a instância está ativa

### Erro: "Invalid token"

**Causa:** Token incorreto ou expirado

**Solução:**
1. Verifique o `ZAPI_INSTANCE_TOKEN` no painel
2. Gere um novo token se necessário
3. Verifique o `ZAPI_ACCOUNT_TOKEN` (se usado)

### Erro: "WhatsApp disconnected"

**Causa:** WhatsApp desconectado da instância

**Solução:**
1. Acesse o painel do Z-API
2. Verifique o status da instância
3. Reconecte escaneando o QR Code novamente

### Mensagens não sendo enviadas

**Possíveis causas:**
1. Instância desconectada
2. Número de telefone em formato incorreto
3. Limite de mensagens atingido (verifique seu plano)
4. Bloqueio do WhatsApp (use com moderação)

**Solução:**
1. Verifique os logs da aplicação
2. Teste via painel do Z-API (Swagger)
3. Verifique o status da instância
4. Entre em contato com suporte Z-API se necessário

## 📊 Monitoramento

### Verificar Status da Instância

No painel do Z-API:
1. Acesse **"Instâncias Web"**
2. Veja o status da sua instância:
   - 🟢 **Conectado** - Tudo funcionando
   - 🟡 **Conectando** - Aguardando conexão
   - 🔴 **Desconectado** - Precisa reconectar

### Verificar Logs

```bash
# Logs da aplicação
docker logs fila-api

# Ou se rodando localmente
npm run start:dev
```

Procure por:
- `Z-API WhatsApp provider initialized` - Configuração OK
- `Sending WhatsApp via Z-API to...` - Enviando mensagem
- `WhatsApp sent successfully via Z-API` - Sucesso
- `Z-API error` - Erro (verifique detalhes)

## 💰 Custos

O Z-API cobra por mensagem enviada. Consulte os preços atualizados em:
- https://www.z-api.io/

Geralmente:
- ~R$ 0,05 - R$ 0,10 por mensagem
- Planos mensais disponíveis
- Sem custos de setup

## 📚 Recursos Adicionais

- **Documentação Oficial:** https://developer.z-api.io/
- **Central do Desenvolvedor:** https://www.z-api.io/central-do-desenvolvedor/
- **Swagger (Testes):** Disponível na central do desenvolvedor
- **Suporte:** Contato via painel do Z-API

## ✅ Checklist de Configuração

- [ ] Conta criada no Z-API
- [ ] Instância criada
- [ ] WhatsApp conectado (QR Code escaneado)
- [ ] Instance ID copiado
- [ ] Instance Token copiado
- [ ] Account Token gerado e copiado
- [ ] Variáveis de ambiente configuradas
- [ ] Aplicação reiniciada
- [ ] Status verificado (`/api/v1/whatsapp/status`)
- [ ] Teste de envio realizado
- [ ] Mensagem recebida no WhatsApp

---

**Última atualização:** Janeiro 2025
