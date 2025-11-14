-- ================================================
-- Migração: Separar Estado Operacional das Filas
-- Data: 2025-01-12
-- Descrição: Criar tabelas queue_states e queue_ticket_history
--            para separar configuração de estado operacional
-- ================================================

-- 1. Criar tabela queue_states
CREATE TABLE IF NOT EXISTS "queue_states" (
  "id"                TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "queueId"           TEXT NOT NULL UNIQUE,
  "currentTicketId"   TEXT,
  "previousTicketId"  TEXT,
  "lastCalledAt"      TIMESTAMP,
  "totalProcessed"    INTEGER NOT NULL DEFAULT 0,
  "createdAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "queue_states_queueId_fkey" 
    FOREIGN KEY ("queueId") REFERENCES "queues"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT "queue_states_currentTicketId_fkey" 
    FOREIGN KEY ("currentTicketId") REFERENCES "tickets"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE,
    
  CONSTRAINT "queue_states_previousTicketId_fkey" 
    FOREIGN KEY ("previousTicketId") REFERENCES "tickets"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS "queue_states_queueId_idx" ON "queue_states"("queueId");
CREATE INDEX IF NOT EXISTS "queue_states_currentTicketId_idx" ON "queue_states"("currentTicketId");
CREATE INDEX IF NOT EXISTS "queue_states_previousTicketId_idx" ON "queue_states"("previousTicketId");

-- 2. Criar tabela queue_ticket_history
CREATE TABLE IF NOT EXISTS "queue_ticket_history" (
  "id"            TEXT NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "queueId"       TEXT NOT NULL,
  "ticketId"      TEXT NOT NULL,
  "action"        TEXT NOT NULL,
  "callingToken"  TEXT NOT NULL,
  "calledBy"      TEXT,
  "calledAt"      TIMESTAMP NOT NULL,
  "metadata"      JSONB,
  "createdAt"     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "queue_ticket_history_queueId_fkey" 
    FOREIGN KEY ("queueId") REFERENCES "queues"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE,
    
  CONSTRAINT "queue_ticket_history_ticketId_fkey" 
    FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para performance e queries de relatórios
CREATE INDEX IF NOT EXISTS "queue_ticket_history_queueId_idx" ON "queue_ticket_history"("queueId");
CREATE INDEX IF NOT EXISTS "queue_ticket_history_ticketId_idx" ON "queue_ticket_history"("ticketId");
CREATE INDEX IF NOT EXISTS "queue_ticket_history_calledAt_idx" ON "queue_ticket_history"("calledAt" DESC);
CREATE INDEX IF NOT EXISTS "queue_ticket_history_action_idx" ON "queue_ticket_history"("action");

-- 3. Migrar dados existentes de queues para queue_states
INSERT INTO "queue_states" ("queueId", "currentTicketId", "previousTicketId", "createdAt", "updatedAt")
SELECT 
  q.id,
  q."currentTicketId",
  q."previousTicketId",
  q."createdAt",
  q."updatedAt"
FROM "queues" q
ON CONFLICT ("queueId") DO NOTHING;

-- 4. Remover foreign keys antigas da tabela queues
ALTER TABLE "queues" DROP CONSTRAINT IF EXISTS "queues_currentTicketId_fkey";
ALTER TABLE "queues" DROP CONSTRAINT IF EXISTS "queues_previousTicketId_fkey";

-- 5. Remover índices antigos
DROP INDEX IF EXISTS "queues_currentTicketId_idx";
DROP INDEX IF EXISTS "queues_previousTicketId_idx";

-- 6. Remover campos antigos da tabela queues
ALTER TABLE "queues" DROP COLUMN IF EXISTS "currentTicketId";
ALTER TABLE "queues" DROP COLUMN IF EXISTS "previousTicketId";

-- 7. Atualizar função de trigger para incluir histórico
CREATE OR REPLACE FUNCTION notify_and_log_ticket_change()
RETURNS TRIGGER AS $$
DECLARE
  queue_data RECORD;
  user_id TEXT;
BEGIN
  -- Buscar dados da fila
  SELECT q.id, q.name, q."tenantId"
  INTO queue_data
  FROM queues q
  WHERE q.id = NEW."queueId";

  -- Tentar obter userId se disponível
  user_id := NEW."userId";

  -- === INSERIR NO HISTÓRICO ===
  
  -- Quando ticket é chamado (status muda para CALLED)
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status = 'CALLED') THEN
    -- Inserir no histórico
    INSERT INTO "queue_ticket_history" (
      "queueId", 
      "ticketId", 
      "action", 
      "callingToken", 
      "calledBy", 
      "calledAt",
      "metadata"
    ) VALUES (
      NEW."queueId",
      NEW.id,
      'CALLED',
      NEW."myCallingToken",
      user_id,
      NEW."calledAt",
      json_build_object(
        'clientName', NEW."clientName",
        'clientPhone', NEW."clientPhone",
        'priority', NEW.priority,
        'estimatedTime', NEW."estimatedTime"
      )::jsonb
    );
    
    -- Notificar via PostgreSQL NOTIFY
    PERFORM pg_notify(
      'ticket_updates',
      json_build_object(
        'id', NEW.id,
        'action', 'TICKET_CALLED',
        'queueId', NEW."queueId",
        'queueName', queue_data.name,
        'tenantId', queue_data."tenantId",
        'myCallingToken', NEW."myCallingToken",
        'clientName', NEW."clientName",
        'clientPhone', NEW."clientPhone",
        'priority', NEW.priority,
        'calledAt', NEW."calledAt",
        'timestamp', extract(epoch from now())
      )::text
    );
  END IF;

  -- Quando ticket é completado
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')) THEN
    -- Inserir no histórico
    INSERT INTO "queue_ticket_history" (
      "queueId", 
      "ticketId", 
      "action", 
      "callingToken", 
      "calledBy", 
      "calledAt",
      "metadata"
    ) VALUES (
      NEW."queueId",
      NEW.id,
      NEW.status,
      NEW."myCallingToken",
      user_id,
      COALESCE(NEW."completedAt", CURRENT_TIMESTAMP),
      json_build_object(
        'serviceTime', EXTRACT(EPOCH FROM (NEW."completedAt" - NEW."calledAt")),
        'status', NEW.status
      )::jsonb
    );
    
    -- Notificar via PostgreSQL NOTIFY
    PERFORM pg_notify(
      'ticket_updates',
      json_build_object(
        'id', NEW.id,
        'action', 'TICKET_COMPLETED',
        'queueId', NEW."queueId",
        'queueName', queue_data.name,
        'tenantId', queue_data."tenantId",
        'myCallingToken', NEW."myCallingToken",
        'status', NEW.status,
        'completedAt', NEW."completedAt",
        'timestamp', extract(epoch from now())
      )::text
    );
  END IF;

  -- Quando ticket é criado (INSERT)
  IF (TG_OP = 'INSERT') THEN
    PERFORM pg_notify(
      'ticket_updates',
      json_build_object(
        'id', NEW.id,
        'action', 'INSERT',
        'queueId', NEW."queueId",
        'queueName', queue_data.name,
        'tenantId', queue_data."tenantId",
        'myCallingToken', NEW."myCallingToken",
        'status', NEW.status,
        'priority', NEW.priority,
        'timestamp', extract(epoch from now())
      )::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recriar trigger com nova função
DROP TRIGGER IF EXISTS ticket_status_change ON tickets;
CREATE TRIGGER ticket_status_change
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_and_log_ticket_change();

-- 8. Comentários para documentação
COMMENT ON TABLE "queue_states" IS 'Estado operacional em tempo real de cada fila (senha atual, anterior, estatísticas)';
COMMENT ON TABLE "queue_ticket_history" IS 'Histórico completo de chamadas de senhas para auditoria e relatórios';
COMMENT ON COLUMN "queue_states"."currentTicketId" IS 'ID do ticket sendo atendido atualmente';
COMMENT ON COLUMN "queue_states"."previousTicketId" IS 'ID do ticket que foi atendido anteriormente';
COMMENT ON COLUMN "queue_states"."totalProcessed" IS 'Contador total de tickets processados nesta fila';
COMMENT ON COLUMN "queue_ticket_history"."action" IS 'Ação realizada: CALLED, COMPLETED, NO_SHOW, CANCELLED';
COMMENT ON COLUMN "queue_ticket_history"."calledBy" IS 'ID do usuário que chamou o ticket';
COMMENT ON COLUMN "queue_ticket_history"."metadata" IS 'Dados adicionais em JSON (tempo de serviço, prioridade, etc)';
COMMENT ON FUNCTION notify_and_log_ticket_change() IS 'Função trigger para registrar histórico e notificar mudanças de tickets';

-- 9. Criar função auxiliar para calcular tempo médio
CREATE OR REPLACE FUNCTION get_queue_avg_call_time(p_queue_id TEXT, p_days INTEGER DEFAULT 7)
RETURNS INTERVAL AS $$
DECLARE
  avg_time INTERVAL;
BEGIN
  SELECT AVG(
    EXTRACT(EPOCH FROM (
      (metadata->>'serviceTime')::numeric * INTERVAL '1 second'
    ))
  ) * INTERVAL '1 second'
  INTO avg_time
  FROM "queue_ticket_history"
  WHERE "queueId" = p_queue_id
    AND action = 'COMPLETED'
    AND "calledAt" >= (CURRENT_TIMESTAMP - (p_days || ' days')::INTERVAL)
    AND metadata->>'serviceTime' IS NOT NULL;
    
  RETURN COALESCE(avg_time, INTERVAL '0');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_queue_avg_call_time(TEXT, INTEGER) IS 'Calcula tempo médio de atendimento de uma fila nos últimos N dias';

-- 10. Mensagem de sucesso
DO $$ 
BEGIN 
  RAISE NOTICE '✅ Migração concluída com sucesso!';
  RAISE NOTICE '📊 Tabelas queue_states e queue_ticket_history criadas';
  RAISE NOTICE '🔄 Dados migrados de queues para queue_states';
  RAISE NOTICE '🗑️  Campos antigos removidos da tabela queues';
  RAISE NOTICE '📈 Sistema pronto para relatórios e auditoria';
END $$;



