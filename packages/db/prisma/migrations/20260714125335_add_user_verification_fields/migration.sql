-- CreateEnum
CREATE TYPE "StaffApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "InventoryMovementStatus" ADD VALUE 'PARTIAL';

-- AlterTable
ALTER TABLE "InventoryMovement" ADD COLUMN     "requestBatchId" TEXT,
ADD COLUMN     "requestedFor" TEXT,
ADD COLUMN     "requestedQuantity" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "team" TEXT;

-- AlterTable
ALTER TABLE "StaffProfile" ADD COLUMN     "approvalStatus" "StaffApprovalStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3),
ADD COLUMN     "reviewedById" TEXT,
ALTER COLUMN "mntdTeams" DROP DEFAULT,
ALTER COLUMN "mntdProjectsInvolved" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "emailVerified" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "verificationCode" TEXT,
ALTER COLUMN "hashedPassword" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "InventoryMovement_requestBatchId_idx" ON "InventoryMovement"("requestBatchId");

-- CreateIndex
CREATE INDEX "StaffProfile_approvalStatus_idx" ON "StaffProfile"("approvalStatus");

-- CreateIndex
CREATE INDEX "StockItem_name_idx" ON "StockItem"("name");

-- CreateIndex
CREATE INDEX "StockItem_sku_idx" ON "StockItem"("sku");

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
