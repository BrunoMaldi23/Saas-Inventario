-- CreateTable
CREATE TABLE "Company" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "businessType" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "parentId" UUID,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "categoryId" UUID,
    "sku" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "minStock" DECIMAL(18,3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "taxId" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Company_tenantId_status_name_idx" ON "Company"("tenantId", "status", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Company_id_tenantId_key" ON "Company"("id", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_tenantId_taxId_key" ON "Company"("tenantId", "taxId");

-- CreateIndex
CREATE INDEX "Branch_tenantId_status_name_idx" ON "Branch"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Branch_companyId_tenantId_idx" ON "Branch"("companyId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Branch_id_tenantId_key" ON "Branch"("id", "tenantId");

-- CreateIndex
CREATE INDEX "Category_tenantId_status_name_idx" ON "Category"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Category_parentId_tenantId_idx" ON "Category"("parentId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Category_id_tenantId_key" ON "Category"("id", "tenantId");

-- CreateIndex
CREATE INDEX "Product_tenantId_status_name_idx" ON "Product"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Product_categoryId_tenantId_idx" ON "Product"("categoryId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_sku_key" ON "Product"("tenantId", "sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_tenantId_barcode_key" ON "Product"("tenantId", "barcode");

-- CreateIndex
CREATE INDEX "Supplier_tenantId_status_name_idx" ON "Supplier"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Warehouse_tenantId_status_name_idx" ON "Warehouse"("tenantId", "status", "name");

-- CreateIndex
CREATE INDEX "Warehouse_branchId_tenantId_idx" ON "Warehouse"("branchId", "tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_tenantId_branchId_name_key" ON "Warehouse"("tenantId", "branchId", "name");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Branch" ADD CONSTRAINT "Branch_companyId_tenantId_fkey" FOREIGN KEY ("companyId", "tenantId") REFERENCES "Company"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_tenantId_fkey" FOREIGN KEY ("parentId", "tenantId") REFERENCES "Category"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_categoryId_tenantId_fkey" FOREIGN KEY ("categoryId", "tenantId") REFERENCES "Category"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supplier" ADD CONSTRAINT "Supplier_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_branchId_tenantId_fkey" FOREIGN KEY ("branchId", "tenantId") REFERENCES "Branch"("id", "tenantId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- PostgreSQL NULL values need separate indexes for root and child categories.
CREATE UNIQUE INDEX "Category_root_name_key" ON "Category"("tenantId", "name") WHERE "parentId" IS NULL;
CREATE UNIQUE INDEX "Category_child_name_key" ON "Category"("tenantId", "parentId", "name") WHERE "parentId" IS NOT NULL;
ALTER TABLE "Product" ADD CONSTRAINT "Product_minStock_nonnegative" CHECK ("minStock" IS NULL OR "minStock" >= 0);

-- Add catalog permissions to tenants bootstrapped before this migration.
INSERT INTO "Permission" ("id", "key")
SELECT gen_random_uuid(), key FROM (VALUES
    ('companies:read'),
    ('companies:write'),
    ('branches:read'),
    ('branches:write'),
    ('categories:read'),
    ('categories:write'),
    ('products:read'),
    ('products:write'),
    ('suppliers:read'),
    ('suppliers:write'),
    ('warehouses:read'),
    ('warehouses:write')
) AS catalog(key)
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r CROSS JOIN "Permission" p
WHERE p."key" IN ('companies:read', 'companies:write', 'branches:read', 'branches:write', 'categories:read', 'categories:write', 'products:read', 'products:write', 'suppliers:read', 'suppliers:write', 'warehouses:read', 'warehouses:write')
  AND (
    r."name" IN ('Owner', 'Admin')
    OR (r."name" = 'InventoryManager' AND (p."key" LIKE '%:read' OR p."key" IN ('categories:write', 'products:write', 'suppliers:write', 'warehouses:write')))
    OR (r."name" = 'BranchManager' AND (p."key" LIKE '%:read' OR p."key" IN ('products:write', 'suppliers:write', 'warehouses:write')))
    OR (r."name" = 'Viewer' AND p."key" LIKE '%:read')
  )
ON CONFLICT DO NOTHING;
