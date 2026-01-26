-- CreateEnum
CREATE TYPE "AgentStatus" AS ENUM ('OFFLINE', 'AVAILABLE', 'BUSY', 'ON_BREAK', 'AWAY');

-- AlterTable
ALTER TABLE "agents" ADD COLUMN "status" "AgentStatus" NOT NULL DEFAULT 'OFFLINE',
ADD COLUMN "currentTicketId" TEXT;

-- AlterTable
ALTER TABLE "queues" ADD COLUMN "isPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "pausedReason" TEXT,
ADD COLUMN "alternativeQueueId" TEXT;
