# Configuração Evolution API para WhatsApp

> **Nota:** Este projeto está hospedado no **Google Cloud Run**. Para deploy do Evolution API no GCP, veja: [EVOLUTION-API-GCP-DEPLOY.md](./EVOLUTION-API-GCP-DEPLOY.md)

## 🎯 Por que Evolution API?

Para um SaaS multi-tenant, Evolution API é a melhor escolha porque:

- ✅ **100% Gratuito** (apenas custo do servidor)
- ✅ **Sem limites** de mensagens
- ✅ **Sem dependência** de APIs terceiras pagas
- ✅ **Controle total** sobre os dados
- ✅ **Escalável** sem custos adicionais por mensagem
- ✅ **Open Source** (você hospeda)

## 📋 Pré-requisitos

- Docker e Docker Compose instalados
- Servidor com pelo menos 2GB RAM
- Porta 8080 disponível (ou outra de sua escolha)

## 🚀 Instalação Rápida

### 1. Instalar Evolution API via Docker

```bash
docker run -d \
  --name evolution-api \
  -p 8080:8080 \
  -e AUTHENTICATION_API_KEY=SUA_CHAVE_SECRETA_AQUI \
  -e CONFIG_SESSION_PHONE_CLIENT=Chrome \
  -e CONFIG_SESSION_PHONE_NAME=chrome \
  -e WEBHOOK_GLOBAL_ENABLED=true \
  -e WEBHOOK_GLOBAL_URL=https://seu-dominio.com/webhook \
  -e WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false \
  atendai/evolution-api:latest
```

### 2. Configurar Variáveis de Ambiente

Adicione no seu `.env`:

```bash
# WhatsApp Provider
WHATSAPP_PROVIDER=evolution

# Evolution API Configuration
EVOLUTION_API_URL=http://localhost:8080
EVOLUTION_API_KEY=SUA_CHAVE_SECRETA_AQUI
EVOLUTION_INSTANCE_NAME=default
```

### 3. Criar Instância no Evolution API

```bash
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "default",
    "token": "seu-token-opcional",
    "qrcode": true,
    "integration": "WHATSAPP-BAILEYS"
  }'
```

### 4. Conectar WhatsApp

1. Acesse: `http://localhost:8080/instance/connect/default`
2. Escaneie o QR Code com seu WhatsApp
3. Aguarde a conexão ser estabelecida

### 5. Verificar Status

```bash
curl -X GET http://localhost:8080/instance/fetchInstances \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI"
```

## 🔧 Configuração Avançada

### Docker Compose (Recomendado)

Crie um arquivo `docker-compose.evolution.yml`:

```yaml
version: '3.8'

services:
  evolution-api:
    image: atendai/evolution-api:latest
    container_name: evolution-api
    restart: unless-stopped
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}
      - CONFIG_SESSION_PHONE_CLIENT=Chrome
      - CONFIG_SESSION_PHONE_NAME=chrome
      - WEBHOOK_GLOBAL_ENABLED=true
      - WEBHOOK_GLOBAL_URL=${WEBHOOK_URL}
      - WEBHOOK_GLOBAL_WEBHOOK_BY_EVENTS=false
      - DATABASE_ENABLED=true
      - DATABASE_CONNECTION_URI=${DATABASE_URL}
    volumes:
      - evolution_data:/evolution/.evolution
    networks:
      - fila-network

volumes:
  evolution_data:

networks:
  fila-network:
    external: true
```

Execute:

```bash
docker-compose -f docker-compose.evolution.yml up -d
```

### Múltiplas Instâncias (Multi-tenant)

Para cada tenant/cliente, crie uma instância separada:

```bash
# Instância para tenant 1
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "tenant-1",
    "qrcode": true
  }'

# Instância para tenant 2
curl -X POST http://localhost:8080/instance/create \
  -H "apikey: SUA_CHAVE_SECRETA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "instanceName": "tenant-2",
    "qrcode": true
  }'
```

No código, você pode mapear `tenantId` para `instanceName`:

```typescript
// Exemplo: usar tenantId como instanceName
const instanceName = tenant.id; // ou tenant.evolutionInstanceName
```

## 🔄 Migração do Twilio para Evolution API

### Passo 1: Instalar Evolution API

Siga os passos acima de instalação.

### Passo 2: Alterar Variável de Ambiente

```bash
# De:
WHATSAPP_PROVIDER=twilio

# Para:
WHATSAPP_PROVIDER=evolution
```

### Passo 3: Configurar Evolution API

Configure as variáveis `EVOLUTION_API_URL`, `EVOLUTION_API_KEY` e `EVOLUTION_INSTANCE_NAME`.

### Passo 4: Testar

O código já está preparado! Apenas mude a variável de ambiente e reinicie a aplicação.

## 📊 Comparação de Custos

### Cenário: 10.000 mensagens/mês

| Solução | Custo Mensal |
|---------|--------------|
| **Evolution API** | R$ 20-50 (servidor) |
| **Twilio** | ~R$ 250 (US$ 0,005/msg) |
| **Z-API** | ~R$ 500-1.000 |
| **Zenvia** | ~R$ 800-1.500 |

### Cenário: 100.000 mensagens/mês

| Solução | Custo Mensal |
|---------|--------------|
| **Evolution API** | R$ 20-50 (servidor) |
| **Twilio** | ~R$ 2.500 |
| **Z-API** | ~R$ 5.000-10.000 |
| **Zenvia** | ~R$ 8.000-15.000 |

**Economia:** Com Evolution API, você economiza **98-99%** dos custos!

## 🛠️ Troubleshooting

### Erro: "Evolution API not configured"

Verifique se as variáveis estão corretas:

```bash
echo $EVOLUTION_API_URL
echo $EVOLUTION_API_KEY
echo $EVOLUTION_INSTANCE_NAME
```

### Erro: "Connection refused"

1. Verifique se o Evolution API está rodando:
   ```bash
   docker ps | grep evolution
   ```

2. Teste a conexão:
   ```bash
   curl http://localhost:8080/instance/fetchInstances \
     -H "apikey: SUA_CHAVE_SECRETA_AQUI"
   ```

### WhatsApp desconectado

1. Reconecte a instância:
   ```bash
   curl -X GET http://localhost:8080/instance/connect/default \
     -H "apikey: SUA_CHAVE_SECRETA_AQUI"
   ```

2. Escaneie o QR Code novamente

### Mensagens não sendo enviadas

1. Verifique o status da instância:
   ```bash
   curl -X GET http://localhost:8080/instance/fetchStatus/default \
     -H "apikey: SUA_CHAVE_SECRETA_AQUI"
   ```

2. Verifique os logs:
   ```bash
   docker logs evolution-api
   ```

## 📚 Recursos

- **Documentação oficial:** https://evolution-api.com/
- **GitHub:** https://github.com/EvolutionAPI/evolution-api
- **Discord:** https://discord.gg/evolutionapi

## 🔒 Segurança

1. **Use HTTPS** em produção
2. **Proteja a API Key** (nunca commite no Git)
3. **Use firewall** para limitar acesso à porta 8080
4. **Configure autenticação** adequada
5. **Backup regular** dos dados do Evolution API

## 💡 Dicas

1. **Use um servidor dedicado** para Evolution API em produção
2. **Configure monitoramento** (logs, métricas)
3. **Faça backup** regular dos dados
4. **Use múltiplas instâncias** para alta disponibilidade
5. **Configure webhooks** para receber mensagens

---

**Última atualização:** Janeiro 2025
