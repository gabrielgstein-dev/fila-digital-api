# 🗄️ Configuração do Banco de Dados - Render

Este documento garante que **TODOS OS AMBIENTES** usem exclusivamente o banco de dados PostgreSQL hospedado no **Render**, nunca o Cloud SQL do Google Cloud.

## 📋 Resumo da Configuração

### ✅ Ambientes Configurados

| Ambiente | Workflow | DATABASE_URL Secret | Status |
|----------|----------|-------------------|---------|
| **Staging** | `cloudrun-deploy-stage.yml` | `DATABASE_URL_STAGE` | ✅ Configurado |
| **Produção** | `cloudrun-deploy-prod.yml` | `DATABASE_URL_PROD` | ✅ Configurado |
| **Main/Master** | `deploy-cloud-run.yml` | `DATABASE_URL_RENDER` | ✅ Configurado |
| **Cloud Build** | `cloudbuild.yaml` | `DATABASE_URL_RENDER` | ✅ Configurado |

## 🔧 Configuração por Ambiente

### 🟡 **Staging (QA)**
- **Arquivo**: `.github/workflows/cloudrun-deploy-stage.yml`
- **Secret**: `DATABASE_URL_STAGE`
- **URL Exemplo**: `postgresql://fila_digital_qa_user:9MNgQAtAv96dQ69qcwnsgOsPvfAVbgEV@dpg-d2i7luv5r7bs73f6s5kg-a.oregon-postgres.render.com:5432/fila_digital_qa?schema=public`
- **Variável Adicional**: `DATABASE_PROVIDER=render`

### 🔴 **Produção**
- **Arquivo**: `.github/workflows/cloudrun-deploy-prod.yml`
- **Secret**: `DATABASE_URL_PROD`
- **URL**: Configurada no Secret Manager do GCP
- **Variável Adicional**: `DATABASE_PROVIDER=render`

### 🔵 **Main/Master**
- **Arquivo**: `.github/workflows/deploy-cloud-run.yml`
- **Secret**: `DATABASE_URL_RENDER`
- **URL**: Configurada no Secret Manager do GCP
- **Variável Adicional**: `DATABASE_PROVIDER=render`

### ⚙️ **Cloud Build**
- **Arquivo**: `cloudbuild.yaml`
- **Secret**: `DATABASE_URL_RENDER`
- **Configuração**: `--update-secrets DATABASE_URL=DATABASE_URL_RENDER:latest`

## 🚫 **NUNCA USAR Cloud SQL**

### ❌ O que NÃO fazer:
- ✗ Configurar conexões com Cloud SQL
- ✗ Usar `--set-cloud-sql-instances`
- ✗ Criar proxy para Cloud SQL
- ✗ Referenciar instâncias do Cloud SQL

### ✅ O que SEMPRE fazer:
- ✓ Usar `DATABASE_URL` apontando para Render
- ✓ Configurar `DATABASE_PROVIDER=render`
- ✓ Verificar que a URL contém `render.com`
- ✓ Manter secrets atualizados no GCP Secret Manager

## 🔍 Validação da Configuração

### Verificar se a URL está correta:
```bash
# A URL deve sempre conter:
postgresql://[user]:[password]@dpg-[hash]-a.oregon-postgres.render.com:5432/[database]?schema=public
```

### Comandos para verificar:
```bash
# Verificar secrets no GCP
gcloud secrets list | grep DATABASE_URL

# Verificar configuração do Cloud Run
gcloud run services describe [SERVICE_NAME] --region [REGION] --format="value(spec.template.spec.containers[0].env[?(@.name=='DATABASE_URL')].value)"
```

## 📝 Secrets Necessários no GCP

Configure estes secrets no Google Cloud Secret Manager:

1. **`DATABASE_URL_RENDER`** - Para builds e deploy principal
2. **`DATABASE_URL_STAGE`** - Para ambiente de staging
3. **`DATABASE_URL_PROD`** - Para ambiente de produção

### Formato do Secret:
```
postgresql://username:password@dpg-hash-a.oregon-postgres.render.com:5432/database_name?schema=public
```

## 🔒 Segurança

- ✅ Todas as credenciais são armazenadas como secrets
- ✅ URLs não são expostas nos logs
- ✅ Conexões sempre via SSL (Render padrão)
- ✅ Acesso restrito por IP (configurado no Render)

## 🚨 Troubleshooting

### Erro de Conexão
1. Verificar se o secret está configurado corretamente
2. Confirmar que a URL do Render está atualizada
3. Verificar se o banco está ativo no Render
4. Testar conexão localmente com a mesma URL

### Deploy Falhando
1. Verificar logs do Cloud Run
2. Confirmar que `DATABASE_PROVIDER=render` está definido
3. Verificar se não há referências ao Cloud SQL
4. Testar com `gcloud run deploy` manual

## 📞 Contato

Em caso de dúvidas sobre a configuração do banco de dados:
- Verificar este documento primeiro
- Conferir se todos os secrets estão atualizados
- Nunca usar Cloud SQL - sempre Render

---

**⚠️ IMPORTANTE**: Este documento deve ser atualizado sempre que houver mudanças na configuração do banco de dados ou nos workflows de deploy.
