# 🚫 Guia do .gitignore

Este documento explica o que está sendo ignorado pelo Git e por quê.

## 📋 **Categorias de Arquivos Ignorados**

### 🔐 **Variáveis de Ambiente**
```
.env*
!.env.example
!.env.render.example
```
**Por quê**: Arquivos `.env` contêm informações sensíveis como senhas, chaves de API e configurações específicas do ambiente.

### 📝 **Logs**
```
logs/
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
```
**Por quê**: Logs são gerados automaticamente e podem conter informações sensíveis.

### 🏗️ **Build e Compilação**
```
dist/
build/
out/
*.tsbuildinfo
```
**Por quê**: Arquivos compilados são gerados automaticamente e não devem ser versionados.

### 🧪 **Testes e Coverage**
```
test/.jest-cache
.jest-cache
coverage/
.nyc_output/
test-results/
playwright-report/
playwright/.cache/
```
**Por quê**: Cache de testes e relatórios de coverage são gerados automaticamente.

### 🔑 **Segurança e Certificados**
```
*.pem
*.key
*.crt
*.p12
*.pfx
*.jks
*.keystore
*.truststore
github-actions-*.json
service-account-*.json
```
**Por quê**: Certificados e chaves de segurança nunca devem ser commitados.

### 💻 **IDEs e Editores**
```
.vscode/
.idea/
*.swp
*.swo
*~
*.sublime-project
*.sublime-workspace
```
**Por quê**: Configurações pessoais de IDEs não devem ser compartilhadas.

### 🐳 **Docker**
```
docker-compose.override.yml
.docker/
.dockerignore.bak
```
**Por quê**: Overrides do Docker são específicos do ambiente local.

### 🗄️ **Banco de Dados**
```
*.db
*.sqlite
*.sqlite3
```
**Por quê**: Bancos de dados locais não devem ser versionados.

### 📦 **Dependências**
```
node_modules/
.npm/
```
**Por quê**: Dependências são instaladas via `package.json` e `pnpm-lock.yaml`.

### 🔄 **Arquivos Temporários**
```
*.tmp
*.temp
*.backup
*.bak
*.orig
*.rej
.tmp/
.temp/
```
**Por quê**: Arquivos temporários são criados automaticamente e não devem ser versionados.

### 🖥️ **Sistema Operacional**
```
.DS_Store
Thumbs.db
```
**Por quê**: Arquivos específicos do sistema operacional.

## ✅ **Arquivos que DEVEM ser Commitados**

### 📄 **Configuração do Projeto**
- `package.json` - Dependências do projeto
- `pnpm-lock.yaml` - Lock file das dependências
- `tsconfig.json` - Configuração do TypeScript
- `jest.config.js` - Configuração dos testes
- `nest-cli.json` - Configuração do NestJS

### 🗄️ **Banco de Dados**
- `prisma/schema.prisma` - Schema do banco
- `prisma/migrations/` - Migrações do banco

### 📚 **Documentação**
- `docs/` - Toda a documentação
- `README.md` - Documentação principal

### 🐳 **Docker**
- `Dockerfile` - Imagem de produção
- `Dockerfile.qa` - Imagem de QA
- `docker-compose.dev.yml` - Desenvolvimento local

### 🔧 **Scripts**
- `scripts/` - Scripts utilitários
- `test-endpoints.js` - Script de teste

### 🌐 **CI/CD**
- `.github/workflows/` - Workflows do GitHub Actions
- `cloudbuild.yaml` - Cloud Build

## 🚨 **Arquivos Críticos que NUNCA devem ser Commitados**

### ❌ **Nunca Commitar**
- Arquivos `.env` (exceto `.example`)
- Chaves de API ou certificados
- Senhas ou tokens
- Arquivos de backup
- Cache de dependências
- Logs de aplicação
- Arquivos temporários

## 🔍 **Como Verificar o que está sendo Ignorado**

```bash
# Verificar se um arquivo está sendo ignorado
git check-ignore -v arquivo.txt

# Ver todos os arquivos ignorados
git status --ignored

# Ver arquivos não rastreados
git status --porcelain | grep "^??"
```

## 🛠️ **Comandos Úteis**

```bash
# Remover arquivo do controle de versão (mas manter local)
git rm --cached arquivo.txt

# Adicionar exceção ao .gitignore
!arquivo-importante.txt

# Verificar arquivos que estão sendo rastreados mas deveriam ser ignorados
git ls-files | grep -E "\.(env|key|pem|crt)$"
```

## 📝 **Manutenção**

- ✅ Sempre revisar o `.gitignore` antes de commits grandes
- ✅ Verificar se novos arquivos sensíveis estão sendo ignorados
- ✅ Atualizar quando adicionar novas ferramentas ou dependências
- ✅ Documentar mudanças significativas no `.gitignore`

---

**⚠️ IMPORTANTE**: Se você acidentalmente commitou arquivos sensíveis, use `git filter-branch` ou `BFG Repo-Cleaner` para removê-los do histórico.
