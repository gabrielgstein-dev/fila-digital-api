-- AlterTable
ALTER TABLE "queues" ALTER COLUMN "capacity" DROP DEFAULT;
ALTER TABLE "queues" ALTER COLUMN "capacity" DROP NOT NULL;

