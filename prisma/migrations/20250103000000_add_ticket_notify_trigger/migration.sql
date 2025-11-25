-- Esta migração foi simplificada para evitar problemas de dependência
-- A função e a trigger serão criadas em uma migração posterior
-- que garanta que a tabela tickets já existe
SELECT 'Skipping migration 20250103000000_add_ticket_notify_trigger - Will be applied in a later migration' as migration_status;
