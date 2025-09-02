-- ============================================================================
-- MIGRATION SCRIPT: number -> myCallingToken
-- ============================================================================
-- Este script converte o campo 'number' (Int) para 'myCallingToken' (String)
-- com prefixos baseados no tipo de fila
--
-- IMPORTANTE: Execute este script em ambiente de desenvolvimento/teste primeiro!
-- ============================================================================

-- 1. Criar nova coluna temporária
ALTER TABLE "tickets" ADD COLUMN "myCallingToken_temp" TEXT;

-- 2. Migrar dados existentes com prefixos
UPDATE "tickets" SET "myCallingToken_temp" = 
  CASE 
    WHEN q.name ILIKE '%exame%' THEN 'B' || "number"::TEXT
    WHEN q.name ILIKE '%consulta%' THEN 'N' || "number"::TEXT  
    WHEN q.name ILIKE '%pediatria%' THEN 'P' || "number"::TEXT
    WHEN q.name ILIKE '%urgencia%' THEN 'U' || "number"::TEXT
    ELSE UPPER(LEFT(q.name, 1)) || "number"::TEXT
  END
FROM "queues" q
WHERE "tickets"."queueId" = q.id;

-- 3. Verificar se todos os registros foram migrados
-- (Execute este SELECT para validar antes de continuar)
SELECT
  COUNT(*) as total_tickets,
  COUNT("myCallingToken_temp") as migrated_tickets,
  COUNT(*) - COUNT("myCallingToken_temp") as missing_migrations
FROM "tickets";

-- 4. Se a validação estiver OK, remover a constraint antiga
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_queueId_number_key";

-- 5. Remover coluna antiga
ALTER TABLE "tickets" DROP COLUMN "number";

-- 6. Renomear coluna nova
ALTER TABLE "tickets" RENAME COLUMN "myCallingToken_temp" TO "myCallingToken";

-- 7. Adicionar nova constraint única
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_queueId_myCallingToken_key" 
  UNIQUE ("queueId", "myCallingToken");

-- 8. Adicionar NOT NULL constraint se necessário
ALTER TABLE "tickets" ALTER COLUMN "myCallingToken"
SET
NOT NULL;

-- ============================================================================
-- ROLLBACK (caso seja necessário reverter)
-- ============================================================================
-- Para reverter, execute:
--
-- ALTER TABLE "tickets" ADD COLUMN "number_temp" INTEGER;
-- UPDATE "tickets" SET "number_temp" = REGEXP_REPLACE("myCallingToken", '[A-Z]', '', 'g')::INTEGER;
-- ALTER TABLE "tickets" DROP CONSTRAINT "tickets_queueId_myCallingToken_key";
-- ALTER TABLE "tickets" DROP COLUMN "myCallingToken";
-- ALTER TABLE "tickets" RENAME COLUMN "number_temp" TO "number";
-- ALTER TABLE "tickets" ADD CONSTRAINT "tickets_queueId_number_key" UNIQUE ("queueId", "number");
-- ============================================================================
