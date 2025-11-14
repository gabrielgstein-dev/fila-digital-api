-- Migration: Criar tabela queue_daily_stats para agregações diárias
-- Descrição: Tabela para armazenar métricas pré-calculadas por dia, melhorando performance de consultas históricas

CREATE TABLE IF NOT EXISTS "queue_daily_stats" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "queueId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "totalProcessed" INTEGER DEFAULT 0,
  "totalCompleted" INTEGER DEFAULT 0,
  "totalNoShow" INTEGER DEFAULT 0,
  "totalCancelled" INTEGER DEFAULT 0,
  "avgServiceTime" INTEGER DEFAULT 0,
  "avgWaitTime" INTEGER DEFAULT 0,
  "peakHour" INTEGER,
  "totalTicketsCreated" INTEGER DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "queue_daily_stats_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "queue_daily_stats_queueId_date_idx" ON "queue_daily_stats"("queueId", "date");
CREATE INDEX IF NOT EXISTS "queue_daily_stats_date_idx" ON "queue_daily_stats"("date" DESC);
CREATE INDEX IF NOT EXISTS "queue_daily_stats_queueId_idx" ON "queue_daily_stats"("queueId");

COMMENT ON TABLE "queue_daily_stats" IS 'Agregações diárias de métricas de filas para melhor performance em consultas históricas';
COMMENT ON COLUMN "queue_daily_stats"."totalProcessed" IS 'Total de tickets processados (COMPLETED + NO_SHOW + CANCELLED)';
COMMENT ON COLUMN "queue_daily_stats"."totalCompleted" IS 'Total de tickets completados com sucesso';
COMMENT ON COLUMN "queue_daily_stats"."totalNoShow" IS 'Total de tickets com no-show';
COMMENT ON COLUMN "queue_daily_stats"."avgServiceTime" IS 'Tempo médio de atendimento em segundos';
COMMENT ON COLUMN "queue_daily_stats"."avgWaitTime" IS 'Tempo médio de espera antes de ser chamado em segundos';
COMMENT ON COLUMN "queue_daily_stats"."peakHour" IS 'Hora do dia com maior volume de atendimentos (0-23)';
