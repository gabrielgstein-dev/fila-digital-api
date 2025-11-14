-- Remover trigger e função
DROP TRIGGER IF EXISTS ticket_changes_trigger
ON tickets;
DROP FUNCTION IF EXISTS notify_ticket_changes
();
