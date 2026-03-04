-- AlterTable
ALTER TABLE "Order" ADD COLUMN "refundedAt" DATETIME;
ALTER TABLE "Order" ADD COLUMN "refundedByUserId" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundReason" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundReference" TEXT;
ALTER TABLE "Order" ADD COLUMN "refundEmailSentAt" DATETIME;
