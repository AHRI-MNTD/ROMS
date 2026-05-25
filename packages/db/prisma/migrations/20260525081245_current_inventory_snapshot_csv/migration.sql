-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "recipient" TEXT;

-- AlterTable
ALTER TABLE "StockItem" ADD COLUMN     "balancePercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "category" TEXT,
ADD COLUMN     "checkInTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "checkOutTotal" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sourceCode" TEXT;

-- CreateIndex
CREATE INDEX "StockItem_sourceCode_idx" ON "StockItem"("sourceCode");
