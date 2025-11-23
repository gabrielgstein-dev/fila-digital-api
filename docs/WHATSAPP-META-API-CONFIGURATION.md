# Configuração WhatsApp Business API (Meta)

Este documento explica como configurar o envio automático de mensagens WhatsApp via Meta WhatsApp Business API (Cloud API).

## 📋 Pré-requisitos

1. Conta no Meta for Developers (https://developers.facebook.com/)
2. Aplicativo criado no Meta for Developers
3. WhatsApp Business Account (WABA) configurado
4. Número de telefone verificado e conectado ao WABA
5. Template de mensagem aprovado pela Meta (para mensagens fora da janela de 24h)

## 🔧 Configuração Passo a Passo

### 1. Criar Aplicativo no Meta for Developers

1. Acesse https://developers.facebook.com/
2. Vá em **Meus Apps** > **Criar App**
3. Selecione **Business** como tipo de app
4. Preencha os dados do aplicativo
5. Anote o **App ID** e **App Secret**

### 2. Configurar WhatsApp Business API

1. No painel do seu app, vá em **Produtos** > **WhatsApp** > **Configurar**
2. Siga o processo de configuração do WhatsApp Business API
3. Você precisará:
   - Criar ou conectar um WhatsApp Business Account (WABA)
   - Verificar um número de telefone
   - Configurar webhooks (opcional, para receber mensagens)

### 3. Obter Credenciais Necessárias

Você precisará das seguintes informações:

#### 3.1. Phone Number ID

1. No painel do app, vá em **WhatsApp** > **API Setup**
2. Copie o **Phone number ID** (ex: `123456789012345`)
3. Este é o ID do número de telefone que você verificou

#### 3.2. Access Token (Temporário - para testes)

1. No painel do app, vá em **WhatsApp** > **API Setup**
2. Copie o **Temporary access token**
3. ⚠️ **Atenção**: Este token expira em 1 hora e é apenas para testes

#### 3.3. Access Token Permanente (Produção)

Para produção, você precisa criar um **System User** e gerar um token permanente:

1. No painel do app, vá em **Configurações** > **Usuários do sistema**
2. Clique em **Adicionar** > **Criar novo usuário do sistema**
3. Dê um nome ao usuário e selecione o tipo **Aplicativo**
4. Após criar, clique em **Gerar novo token**
5. Selecione:
   - **App**: Seu aplicativo
   - **Permissões**: `whatsapp_business_messaging`, `whatsapp_business_management`
6. Copie o token gerado (este é permanente, mas pode ser revogado)

#### 3.4. WhatsApp Business Account ID (WABA ID)

1. No painel do app, vá em **WhatsApp** > **API Setup**
2. Copie o **WhatsApp Business Account ID** (ex: `123456789012345`)

#### 3.5. API Version

A versão da API do Graph. Atualmente recomendado: `v19.0` ou `v18.0`

### 4. Configurar Variáveis de Ambiente

Adicione as seguintes variáveis ao seu arquivo `.env`:

```bash
# Meta WhatsApp Business API Configuration
META_API_VERSION=v19.0
META_PHONE_NUMBER_ID=seu_phone_number_id_aqui
META_ACCESS_TOKEN=seu_access_token_aqui
META_WABA_ID=seu_waba_id_aqui
META_APP_ID=seu_app_id_aqui
```

**⚠️ IMPORTANTE:**
- **NÃO** coloque aspas ao redor dos valores no `.env`
- O token deve ser o token permanente (System User), não o temporário
- Mantenha essas variáveis seguras e nunca as commite no Git

### 5. Verificar Configuração

Após configurar, você pode verificar se está funcionando:

1. Verifique os logs ao iniciar o servidor - deve aparecer: `Meta WhatsApp provider initialized`
2. Teste enviando uma mensagem via API
3. Verifique os logs para erros de autenticação

## 🔍 Troubleshooting

### Erro 401 - Unauthorized

O erro 401 indica que a autenticação falhou. Verifique:

1. **Token expirado ou inválido**
   - Se estiver usando token temporário, ele expira em 1 hora
   - Gere um novo token permanente via System User

2. **Phone Number ID incorreto**
   - Verifique se o ID está correto no painel do Meta
   - O ID deve ser apenas números, sem espaços ou caracteres especiais

3. **Token sem permissões**
   - O token precisa ter permissões: `whatsapp_business_messaging`
   - Verifique as permissões do System User

4. **Número não verificado**
   - O número de telefone precisa estar verificado no WABA
   - Verifique no painel do Meta se o número está ativo

5. **API Version incorreta**
   - Verifique se a versão da API está correta
   - Versões antigas podem não funcionar

### Erro 400 - Bad Request

1. **Template não aprovado**
   - Para mensagens fora da janela de 24h, você precisa usar templates aprovados
   - Crie e submeta templates no painel do Meta

2. **Formato de número incorreto**
   - O número deve estar no formato internacional (ex: `5511999999999`)
   - Sem espaços, parênteses ou hífens

### Erro 403 - Forbidden

1. **Permissões insuficientes**
   - Verifique se o token tem todas as permissões necessárias
   - O System User precisa ter acesso ao WABA

2. **App não aprovado**
   - Em produção, o app precisa estar aprovado pela Meta
   - Verifique o status do app no painel

## 📝 Templates de Mensagem

Para enviar mensagens fora da janela de 24 horas, você precisa criar templates aprovados:

1. No painel do app, vá em **WhatsApp** > **Templates de mensagem**
2. Clique em **Criar modelo**
3. Preencha os dados do template
4. Aguarde aprovação da Meta (pode levar algumas horas)
5. Use o nome do template no código (ex: `queue_info`)

### Templates Usados no Sistema

- `queue_info`: Notificação de entrada na fila (deve estar em **Português - pt_BR**)
  - Ver documentação detalhada: [WHATSAPP-TEMPLATE-QUEUE-INFO-PTBR.md](./WHATSAPP-TEMPLATE-QUEUE-INFO-PTBR.md)
- `atualizacao_fila`: Atualização de posição na fila

## 🔐 Segurança

1. **Nunca commite tokens no Git**
   - Use `.env` local para desenvolvimento
   - Use variáveis de ambiente no servidor
   - Adicione `.env` ao `.gitignore`

2. **Rotacione tokens regularmente**
   - Gere novos tokens periodicamente
   - Revogue tokens antigos que não estão mais em uso

3. **Use System Users para produção**
   - Não use tokens temporários em produção
   - Crie System Users com permissões mínimas necessárias

## 📚 Recursos Adicionais

- [Documentação Oficial Meta WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Guia de Autenticação](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
- [Criar Templates](https://developers.facebook.com/docs/whatsapp/business-management-api/message-templates)

## ✅ Checklist de Configuração

- [ ] App criado no Meta for Developers
- [ ] WhatsApp Business Account (WABA) configurado
- [ ] Número de telefone verificado
- [ ] System User criado
- [ ] Token permanente gerado com permissões corretas
- [ ] Phone Number ID copiado
- [ ] WABA ID copiado
- [ ] Variáveis de ambiente configuradas no `.env`
- [ ] Templates de mensagem criados e aprovados
- [ ] Teste de envio realizado com sucesso

---

**Data de Criação:** 23 de novembro de 2024
**Versão:** 1.0

