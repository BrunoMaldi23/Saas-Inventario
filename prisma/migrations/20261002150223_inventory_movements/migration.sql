-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('INITIAL', 'ENTRY', 'ISSUE', 'ADJUSTMENT', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MovementDirection" AS ENUM ('IN', 'OUT');

-- CreateEnum
CREATE TYPE "TransferStatus" AS ENUM ('COMPLETED');

-- CreateTable
CREATE TABLE "InventoryBalance" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockMovement" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "warehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "transferId" UUID,
    "type" "MovementType" NOT NULL,
    "direction" "MovementDirection" NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "reason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransfer" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "fromWarehouseId" UUID NOT NULL,
    "toWarehouseId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "quantity" DECIMAL(18,3) NOT NULL,
    "status" "TransferStatus" NOT NULL DEFAULT 'COMPLETED',
    "reason" TEXT,
    "createdByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransfer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InventoryBalance_tenantId_productId_idx" ON "InventoryBalance"("tenantId", "productId");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryBalance_tenantId_warehouseId_productId_key" ON "InventoryBalance"("tenantId", "warehouseId", "productId");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_createdAt_id_idx" ON "StockMovement"("tenantId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_productId_createdAt_idx" ON "StockMovement"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_warehouseId_createdAt_idx" ON "StockMovement"("tenantId", "warehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_tenantId_createdByUserId_createdAt_idx" ON "StockMovement"("tenantId", "createdByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "StockMovement_transferId_tenantId_idx" ON "StockMovement"("transferId", "tenantId");

-- CreateIndex
CREATE INDEX "StockTransfer_tenantId_createdAt_id_idx" ON "StockTransfer"("tenantId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "StockTransfer_tenantId_productId_createdAt_idx" ON "StockTransfer"("tenantId", "productId", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_tenantId_fromWarehouseId_createdAt_idx" ON "StockTransfer"("tenantId", "fromWarehouseId", "createdAt");

-- CreateIndex
CREATE INDEX "StockTransfer_tenantId_toWarehouseId_createdAt_idx" ON "StockTransfer"("tenantId", "toWarehouseId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockTransfer_id_tenantId_key" ON "StockTransfer"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_id_tenantId_key" ON "Product"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_id_tenantId_key" ON "Warehouse"("id", "tenantId");

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_warehouseId_tenantId_fkey" FOREIGN KEY ("warehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_warehouseId_tenantId_fkey" FOREIGN KEY ("warehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transferId_tenantId_fkey" FOREIGN KEY ("transferId", "tenantId") REFERENCES "StockTransfer"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_fromWarehouseId_tenantId_fkey" FOREIGN KEY ("fromWarehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_toWarehouseId_tenantId_fkey" FOREIGN KEY ("toWarehouseId", "tenantId") REFERENCES "Warehouse"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_productId_tenantId_fkey" FOREIGN KEY ("productId", "tenantId") REFERENCES "Product"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Database invariants for nonnegative balances and positive movements.
ALTER TABLE "InventoryBalance" ADD CONSTRAINT "InventoryBalance_quantity_nonnegative" CHECK ("quantity" >= 0);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_quantity_positive" CHECK ("quantity" > 0);
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_distinct_warehouses" CHECK ("fromWarehouseId" <> "toWarehouseId");
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_type_direction" CHECK (
  ("type" IN ('INITIAL', 'ENTRY') AND "direction" = 'IN')
  OR ("type" = 'ISSUE' AND "direction" = 'OUT')
  OR ("type" IN ('ADJUSTMENT', 'TRANSFER'))
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_transfer_link" CHECK (
  ("type" = 'TRANSFER' AND "transferId" IS NOT NULL)
  OR ("type" <> 'TRANSFER' AND "transferId" IS NULL)
);
ALTER TABLE "StockMovement" ADD CONSTRAINT "StockMovement_adjustment_reason" CHECK (
  "type" <> 'ADJUSTMENT' OR NULLIF(BTRIM("reason"), '') IS NOT NULL
);

-- Backfill inventory permissions for tenants created in earlier phases.
INSERT INTO "Permission" ("id", "key")
SELECT gen_random_uuid(), key FROM (VALUES
  ('inventory:read'), ('inventory:write'), ('inventory:adjust'), ('inventory:transfer')
) AS inventory(key)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE p."key" IN ('inventory:read', 'inventory:write', 'inventory:adjust', 'inventory:transfer')
  AND (
    r."name" IN ('Owner', 'Admin', 'InventoryManager')
    OR (r."name" = 'BranchManager' AND p."key" IN ('inventory:read', 'inventory:write', 'inventory:transfer'))
    OR (r."name" = 'Viewer' AND p."key" = 'inventory:read')
  )
ON CONFLICT DO NOTHING;
