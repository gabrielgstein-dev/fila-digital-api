-- AlterTable
ALTER TABLE "tickets" ADD COLUMN "preferredAgentId" TEXT;

-- CreateIndex (opcional, para performance)
CREATE INDEX "tickets_preferredAgentId_status_idx" ON "tickets"("preferredAgentId", "status") WHERE "preferredAgentId" IS NOT NULL;
