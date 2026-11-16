CREATE TABLE "ReagentItem" (
    "id" TEXT NOT NULL,
    "reagentCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assayType" TEXT NOT NULL,
    "reagentType" TEXT,
    "concentration" TEXT,
    "availableConcentration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "initialConcentration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "issuedConcentration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedReturnConcentration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "concentrationUnit" TEXT,
    "quantity" DOUBLE PRECISION,
    "quantityUnit" TEXT,
    "volume" DOUBLE PRECISION,
    "volumeUnit" TEXT,
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "storageCondition" TEXT NOT NULL,
    "location" TEXT,
    "receivedFrom" TEXT,
    "minThreshold" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReagentItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReagentMovement" (
    "id" TEXT NOT NULL,
    "reagentItemId" TEXT NOT NULL,
    "movementType" TEXT NOT NULL,
    "concentration" DOUBLE PRECISION NOT NULL,
    "numberOfVill" INTEGER,
    "expectedReturn" DOUBLE PRECISION,
    "projectFor" TEXT,
    "requestedBy" TEXT,
    "recipient" TEXT,
    "status" TEXT NOT NULL DEFAULT 'APPROVED',
    "lotNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "remark" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ReagentMovement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ReagentRequest" (
    "id" TEXT NOT NULL,
    "requestBatchId" TEXT NOT NULL,
    "reagentItemId" TEXT,
    "assayType" TEXT NOT NULL,
    "reagentType" TEXT,
    "projectFor" TEXT,
    "concentration" DOUBLE PRECISION,
    "concentrationUnit" TEXT,
    "numberOfVill" INTEGER,
    "requestedBy" TEXT NOT NULL,
    "requestedFor" TEXT,
    "additionalFields" JSONB,
    "requestedConcentration" DOUBLE PRECISION NOT NULL,
    "approvedConcentration" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expectedReturn" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approver" TEXT,
    "decisionAt" TIMESTAMP(3),
    "disbursedAt" TIMESTAMP(3),
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ReagentRequest_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ReagentItem_reagentCode_key" ON "ReagentItem"("reagentCode");
CREATE INDEX "ReagentItem_assayType_idx" ON "ReagentItem"("assayType");
CREATE INDEX "ReagentItem_reagentType_idx" ON "ReagentItem"("reagentType");
CREATE INDEX "ReagentItem_expiryDate_idx" ON "ReagentItem"("expiryDate");
CREATE INDEX "ReagentItem_storageCondition_idx" ON "ReagentItem"("storageCondition");
CREATE INDEX "ReagentMovement_reagentItemId_idx" ON "ReagentMovement"("reagentItemId");
CREATE INDEX "ReagentMovement_movementType_idx" ON "ReagentMovement"("movementType");
CREATE INDEX "ReagentMovement_status_idx" ON "ReagentMovement"("status");
CREATE INDEX "ReagentMovement_occurredAt_idx" ON "ReagentMovement"("occurredAt");
CREATE INDEX "ReagentRequest_requestBatchId_idx" ON "ReagentRequest"("requestBatchId");
CREATE INDEX "ReagentRequest_status_idx" ON "ReagentRequest"("status");
CREATE INDEX "ReagentRequest_assayType_idx" ON "ReagentRequest"("assayType");
CREATE INDEX "ReagentRequest_requestedBy_idx" ON "ReagentRequest"("requestedBy");

ALTER TABLE "ReagentMovement" ADD CONSTRAINT "ReagentMovement_reagentItemId_fkey" FOREIGN KEY ("reagentItemId") REFERENCES "ReagentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ReagentRequest" ADD CONSTRAINT "ReagentRequest_reagentItemId_fkey" FOREIGN KEY ("reagentItemId") REFERENCES "ReagentItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
