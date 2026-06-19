-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "gameKey" TEXT;

-- CreateTable
CREATE TABLE "GameKey" (
    "id" TEXT NOT NULL,
    "productSlug" TEXT NOT NULL,
    "keyCode" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'PC',
    "assignedOrderId" TEXT,
    "assignedItemId" TEXT,
    "assignedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameKey_keyCode_key" ON "GameKey"("keyCode");

-- CreateIndex
CREATE INDEX "GameKey_productSlug_assignedOrderId_idx" ON "GameKey"("productSlug", "assignedOrderId");

-- AddForeignKey
ALTER TABLE "GameKey" ADD CONSTRAINT "GameKey_productSlug_fkey" FOREIGN KEY ("productSlug") REFERENCES "Product"("slug") ON DELETE RESTRICT ON UPDATE CASCADE;
