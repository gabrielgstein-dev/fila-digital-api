# Dockerfile para produção - Cloud Run
FROM node:22-slim AS base

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração do pnpm
COPY package.json pnpm-lock.yaml ./

# Instalar pnpm globalmente
RUN npm install -g pnpm

# Stage para instalar dependências
FROM base AS deps
RUN pnpm install --frozen-lockfile --prod=false

# Stage para build da aplicação
FROM base AS builder

# Copiar dependências instaladas
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fonte
COPY . .

# Gerar Prisma Client
RUN npx prisma generate

# Build da aplicação
RUN pnpm run build

# Remover dependências de desenvolvimento
RUN pnpm prune --prod

# Stage final - runtime
FROM node:22-slim AS runtime

# Instalar dependências do sistema
RUN apt-get update && apt-get install -y --no-install-recommends \
    dumb-init \
    wget \
    openssl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Criar usuário não-root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nestjs

# Definir diretório de trabalho
WORKDIR /app

# Instalar pnpm
RUN npm install -g pnpm

# Copiar arquivos necessários do builder
COPY --from=builder --chown=nestjs:nodejs /app/dist ./dist
COPY --from=builder --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nestjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nestjs:nodejs /app/prisma ./prisma

# Definir variáveis de ambiente padrão
ENV NODE_ENV=production
ENV PORT=8080

# Expor porta (Cloud Run usa 8080 por padrão)
EXPOSE 8080

# Mudar para usuário não-root
USER nestjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/api/v1/health || exit 1

# Comando para iniciar a aplicação
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"] 