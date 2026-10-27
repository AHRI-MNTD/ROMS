-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN "lotNumber" TEXT,
ADD COLUMN "expiryDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "InventoryMovement_lotNumber_idx" ON "InventoryMovement"("lotNumber");

-- CreateIndex
CREATE INDEX "InventoryMovement_expiryDate_idx" ON "InventoryMovement"("expiryDate");

