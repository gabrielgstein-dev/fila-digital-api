-- AlterTable: Adicionar campos de controle de senha atual e anterior na tabela Queue
ALTER TABLE "queues" ADD COLUMN IF NOT EXISTS "currentTicketId" TEXT;
ALTER TABLE "queues" ADD COLUMN IF NOT EXISTS "previousTicketId" TEXT;

-- AddForeignKey: Relacionamento com ticket atual
ALTER TABLE "queues" ADD CONSTRAINT "queues_currentTicketId_fkey" 
  FOREIGN KEY ("currentTicketId") REFERENCES "tickets"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- AddForeignKey: Relacionamento com ticket anterior
ALTER TABLE "queues" ADD CONSTRAINT "queues_previousTicketId_fkey" 
  FOREIGN KEY ("previousTicketId") REFERENCES "tickets"("id") 
  ON DELETE SET NULL 
  ON UPDATE CASCADE;

-- CreateIndex: Índice para melhor performance
CREATE INDEX IF NOT EXISTS "queues_currentTicketId_idx" ON "queues"("currentTicketId");
CREATE INDEX IF NOT EXISTS "queues_previousTicketId_idx" ON "queues"("previousTicketId");

-- Criar função para notificar mudanças de ticket via PostgreSQL LISTEN/NOTIFY
CREATE OR REPLACE FUNCTION notify_ticket_change()
RETURNS TRIGGER AS $$
DECLARE
  queue_data RECORD;
BEGIN
  -- Buscar dados da fila para incluir na notificação
  SELECT q.id, q.name, q."tenantId"
  INTO queue_data
  FROM queues q
  WHERE q.id = NEW."queueId";

  -- Notificar quando ticket é chamado (status muda para CALLED)
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status = 'CALLED') THEN
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

  -- Notificar quando ticket é criado (INSERT)
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

  -- Notificar quando ticket é completado
  IF (TG_OP = 'UPDATE' AND NEW.status != OLD.status AND NEW.status IN ('COMPLETED', 'NO_SHOW', 'CANCELLED')) THEN
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger se já existir
DROP TRIGGER IF EXISTS ticket_status_change ON tickets;

-- Criar trigger para notificar mudanças de status
CREATE TRIGGER ticket_status_change
AFTER INSERT OR UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION notify_ticket_change();

-- Comentários para documentação
COMMENT ON COLUMN queues."currentTicketId" IS 'ID do ticket sendo chamado atualmente nesta fila';
COMMENT ON COLUMN queues."previousTicketId" IS 'ID do ticket que foi chamado anteriormente nesta fila';
COMMENT ON FUNCTION notify_ticket_change() IS 'Função trigger para notificar mudanças de tickets via PostgreSQL NOTIFY';
COMMENT ON TRIGGER ticket_status_change ON tickets IS 'Trigger para disparar notificações quando tickets mudam de status';

