-- CreateTable
CREATE TABLE "InventoryMasterData" (
    "id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "project" TEXT,
    "staff" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryMasterData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryMasterData_category_idx" ON "InventoryMasterData"("category");

-- CreateIndex
CREATE INDEX "InventoryMasterData_unit_idx" ON "InventoryMasterData"("unit");

-- CreateIndex
CREATE INDEX "InventoryMasterData_project_idx" ON "InventoryMasterData"("project");

-- CreateIndex
CREATE INDEX "InventoryMasterData_staff_idx" ON "InventoryMasterData"("staff");
