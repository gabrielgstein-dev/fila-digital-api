-- Corrigir função notify_ticket_changes para usar nomes de colunas corretos
CREATE OR REPLACE FUNCTION notify_ticket_changes
()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Criar payload com apenas o ID do ticket (recomendação PostgreSQL)
  payload = json_build_object
(
    'id', COALESCE
(NEW.id, OLD.id),
    'action', TG_OP,
    'queueId', COALESCE
(NEW."queueId", OLD."queueId"),
    'timestamp', extract
(epoch from now
())
  );

  -- Enviar notificação para o canal ticket_updates
  PERFORM pg_notify
('ticket_updates', payload::text);

-- Retornar o registro apropriado
IF TG_OP = 'DELETE' THEN
RETURN OLD;
ELSE
RETURN NEW;
END
IF;
END;
$$ LANGUAGE plpgsql;
