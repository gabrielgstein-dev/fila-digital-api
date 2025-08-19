# 🎫 Fila Digital API

Sistema moderno de gerenciamento de filas digitais para empresas. Permite que clientes tirem senhas remotamente e acompanhem o andamento em tempo real, eliminando a necessidade de permanecer fisicamente na fila.

**📍 Repositório:** [gabrielgstein-dev/fila-digital-api](https://github.com/gabrielgstein-dev/fila-digital-api)

## 🚀 Recursos Principais

### 🎯 **Para Clientes**
- ✅ Tirar senha via QR Code ou link
- ✅ Acompanhar posição na fila em tempo real
- ✅ Receber notificações quando for chamado
- ✅ Ver estimativa de tempo de espera
- ✅ Histórico de atendimentos

### 💼 **Para Empresas**
- ✅ Painel de controle de filas
- ✅ Chamar próximo / pular / rechamar
- ✅ Múltiplas filas simultâneas
- ✅ Tipos de fila (Geral, Prioritária, VIP)
- ✅ Dashboard com estatísticas
- ✅ Painel TV para exibição pública

### ⚡ **Recursos Técnicos**
- ✅ **Tempo Real**: WebSocket para atualizações instantâneas
- ✅ **Multi-tenant**: Suporte a múltiplas empresas
- ✅ **Escalável**: Arquitetura otimizada
- ✅ **Seguro**: Autenticação JWT + rate limiting
- ✅ **Documentado**: Swagger integrado

## 🛠️ Tecnologias

### **Backend**
- **Node.js 22** + **TypeScript**
- **NestJS** - Framework escalável
- **Prisma** - ORM moderno
- **PostgreSQL** - Banco de dados
- **Redis** - Cache e sessões
- **Socket.IO** - WebSocket para tempo real
- **JWT** - Autenticação
- **Swagger** - Documentação da API

### **DevOps**
- **Docker** - Containerização
- **GitHub Actions** - CI/CD
- **Google Cloud Run** - Deploy automático
- **Render** - Banco de dados PostgreSQL

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │      API        │    │   Database      │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│ (PostgreSQL)    │
│                 │    │                 │    │                 │
│ • Tirar senha   │    │ • Autenticação  │    │ • Tenants       │
│ • Ver status    │    │ • Filas CRUD    │    │ • Filas         │
│ • Notificações  │    │ • Tickets       │    │ • Tickets       │
│ • Dashboard     │    │ • WebSocket     │    │ • Logs          │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                       ┌─────────────────┐
                       │     Redis       │
                       │                 │
                       │ • Cache         │
                       │ • Sessions      │
                       │ • Pub/Sub       │
                       └─────────────────┘
```

## 🚀 Quick Start

### **Pré-requisitos**
- Node.js 22+
- pnpm
- PostgreSQL
- Redis (opcional)

### **Instalação**

```bash
# Clonar repositório
git clone git@github.com:gabrielgstein-dev/fila-digital-api.git
cd fila-digital-api

# Instalar dependências
pnpm install

# Configurar ambiente
cp .env.example .env
# Editar .env com suas configurações

# Configurar banco de dados
npx prisma migrate dev
npx prisma generate

# Iniciar em desenvolvimento
pnpm run start:dev
```

### **Testes**

```bash
# Testes unitários
pnpm test

# Testes E2E
pnpm run test:e2e

# Coverage
pnpm run test:cov
```

## 📚 Documentação

### **API**
- **🌐 Swagger (local):** http://localhost:3001/api
- **💚 Health Check:** http://localhost:3001/api/v1

### **Guias**
- **📖 [Deploy QA](docs/DEPLOY.md)** - Como fazer deploy em QA
- **🧪 [Testes E2E](test/README.md)** - Documentação dos testes

## 🌍 Ambientes

### **🔧 Desenvolvimento**
- **API:** http://localhost:3001
- **Banco:** Local PostgreSQL
- **Redis:** Local (opcional)

### **🧪 QA**
- **API:** https://fila-api-qa-[hash].europe-west1.run.app
- **Banco:** PostgreSQL no Render
- **Deploy:** Automático via GitHub Actions

### **🚀 Produção**
- **API:** TBD
- **Banco:** TBD
- **Deploy:** TBD

## 📋 Scripts Disponíveis

```bash
# Desenvolvimento
pnpm run start:dev      # Modo desenvolvimento com watch
pnpm run start:debug    # Modo debug

# Build e Produção
pnpm run build          # Build da aplicação
pnpm run start:prod     # Modo produção

# Testes
pnpm test              # Testes unitários
pnpm run test:e2e      # Testes E2E
pnpm run test:cov      # Coverage

# Banco de Dados
pnpm run prisma:generate   # Gerar Prisma Client
pnpm run prisma:migrate    # Executar migrações
pnpm run prisma:studio     # Interface gráfica do banco
pnpm run seed             # Popular banco com dados de teste

# Qualidade de Código
pnpm run lint          # ESLint
pnpm run format        # Prettier
```

## 🔧 Configuração

### **Variáveis de Ambiente**

```env
# Banco de dados
DATABASE_URL="postgresql://user:password@localhost:5432/fila_db"

# JWT
JWT_SECRET="your-super-secret-key"
JWT_EXPIRES_IN="7d"

# Redis (opcional)
REDIS_URL="redis://localhost:6379"

# Aplicação
NODE_ENV="development"
PORT=3001
CORS_ORIGIN="http://localhost:3000"

# WebSockets
WEBSOCKET_CORS_ORIGIN="http://localhost:3000"
```

## 🤝 Contribuição

### **Fluxo de Desenvolvimento**

1. **Criar feature branch**
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```

2. **Desenvolver e testar**
   ```bash
   # Fazer alterações
   pnpm test
   pnpm run test:e2e
   ```

3. **Commit e push**
   ```bash
   git add .
   git commit -m "feat: adicionar nova funcionalidade"
   git push origin feature/nova-funcionalidade
   ```

4. **Criar Pull Request**
   - Para `develop` (QA)
   - Para `main` (Produção)

### **Padrões**

- ✅ **Commits**: Conventional Commits
- ✅ **Code Style**: Prettier + ESLint
- ✅ **Testes**: Mínimo 80% coverage
- ✅ **Documentação**: Swagger atualizado

## 📊 Status do Projeto

- ✅ **MVP Implementado**
- ✅ **Testes E2E Completos**
- ✅ **Deploy QA Configurado**
- ✅ **Documentação Completa**
- 🔄 **Em desenvolvimento ativo**

## 📞 Suporte

- **📧 Issues:** [GitHub Issues](https://github.com/gabrielgstein-dev/fila-digital-api/issues)
- **📖 Docs:** [Documentação](docs/)
- **🧪 Testes:** [Test Suite](test/README.md)

---

**🚀 Feito com ❤️ para modernizar o atendimento ao cliente**

**📍 GitHub:** https://github.com/gabrielgstein-dev/fila-digital-api
