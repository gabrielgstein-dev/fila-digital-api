ALTER TABLE "tickets" DROP CONSTRAINT IF EXISTS "tickets_queueId_number_key";
ALTER TABLE "tickets" DROP COLUMN IF EXISTS "number";
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_queueId_myCallingToken_key" UNIQUE ("queueId", "myCallingToken");
