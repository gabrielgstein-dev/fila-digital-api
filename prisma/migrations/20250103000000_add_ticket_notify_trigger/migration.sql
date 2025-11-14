-- Função para notificar mudanças na tabela tickets
CREATE OR REPLACE FUNCTION notify_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  payload JSON;
BEGIN
  -- Criar payload com apenas o ID do ticket (recomendação PostgreSQL)
  payload = json_build_object(
    'id', COALESCE(NEW.id, OLD.id),
    'action', TG_OP,
    'queueId', COALESCE(NEW.queue_id, OLD.queue_id),
    'timestamp', extract(epoch from now())
  );
  
  -- Enviar notificação para o canal ticket_updates
  PERFORM pg_notify('ticket_updates', payload::text);
  
  -- Retornar o registro apropriado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger para capturar todas as mudanças na tabela tickets
DROP TRIGGER IF EXISTS ticket_changes_trigger ON tickets;
CREATE TRIGGER ticket_changes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON tickets
  FOR EACH ROW
  EXECUTE FUNCTION notify_ticket_changes();

-- Comentário explicativo
COMMENT ON FUNCTION notify_ticket_changes() IS 'Notifica mudanças na tabela tickets via PostgreSQL NOTIFY para sistema de tempo real';
COMMENT ON TRIGGER ticket_changes_trigger ON tickets IS 'Trigger que dispara notificações em tempo real para mudanças de tickets';
