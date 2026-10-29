-- CreateTable
CREATE TABLE IF NOT EXISTS "ProjectLoan" (
    "id" TEXT NOT NULL,
    "loanCode" TEXT NOT NULL,
    "stockItemId" TEXT NOT NULL,
    "borrowerProject" TEXT NOT NULL,
    "lenderProject" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "requestedTo" TEXT,
    "requestedQuantity" INTEGER NOT NULL,
    "approvedQuantity" INTEGER,
    "returnedQuantity" INTEGER DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "requestNotes" TEXT,
    "decisionNotes" TEXT,
    "returnNotes" TEXT,
    "dueDate" TIMESTAMP(3),
    "decisionAt" TIMESTAMP(3),
    "returnedAt" TIMESTAMP(3),
    "returnedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectLoan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ProjectLoan_loanCode_key" ON "ProjectLoan"("loanCode");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectLoan_stockItemId_idx" ON "ProjectLoan"("stockItemId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectLoan_borrowerProject_idx" ON "ProjectLoan"("borrowerProject");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectLoan_lenderProject_idx" ON "ProjectLoan"("lenderProject");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectLoan_status_idx" ON "ProjectLoan"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ProjectLoan_requestedBy_idx" ON "ProjectLoan"("requestedBy");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProjectLoan_stockItemId_fkey'
    ) THEN
        ALTER TABLE "ProjectLoan" ADD CONSTRAINT "ProjectLoan_stockItemId_fkey" FOREIGN KEY ("stockItemId") REFERENCES "StockItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;
