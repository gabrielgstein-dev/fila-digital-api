-- AlterTable
ALTER TABLE "tickets" RENAME COLUMN "number" TO "myCallingToken";

-- AlterTable: Change column type from Int to String
ALTER TABLE "tickets" ALTER COLUMN "myCallingToken" TYPE
TEXT;

-- Update existing data to include prefix based on queue
UPDATE "tickets" SET "myCallingToken" = 
  CASE 
    WHEN q.name ILIKE '%exame%' THEN 'B' || "myCallingToken"
    WHEN q.name ILIKE '%consulta%' THEN 'N' || "myCallingToken"
    WHEN q.name ILIKE '%pediatria%' THEN 'P' || "myCallingToken"
    WHEN q.name ILIKE '%urgencia%' THEN 'U' || "myCallingToken"
    ELSE UPPER(LEFT(q.name, 1)) || "myCallingToken"
  END
FROM "queues" q
WHERE "tickets"."queueId" = q.id;

-- Drop the old unique constraint
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_queueId_number_key";

-- Add the new unique constraint
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_queueId_myCallingToken_key" UNIQUE ("queueId", "myCallingToken");
