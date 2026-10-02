-- Backfill the read-only reports permission for tenants that already exist.
INSERT INTO "Permission" ("id", "key")
VALUES (gen_random_uuid(), 'reports:read')
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r."id", p."id"
FROM "Role" r
CROSS JOIN "Permission" p
WHERE p."key" = 'reports:read'
  AND r."name" IN ('Owner', 'Admin', 'InventoryManager', 'BranchManager', 'Viewer')
ON CONFLICT DO NOTHING;
