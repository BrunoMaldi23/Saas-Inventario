const CATALOG_READ = [
  'companies:read',
  'branches:read',
  'categories:read',
  'products:read',
  'suppliers:read',
  'warehouses:read',
] as const;
const CATALOG_WRITE = [
  'companies:write',
  'branches:write',
  'categories:write',
  'products:write',
  'suppliers:write',
  'warehouses:write',
] as const;

export const ROLE_PERMISSIONS = {
  Owner: [
    'users:read',
    'users:create',
    'memberships:manage',
    ...CATALOG_READ,
    ...CATALOG_WRITE,
  ],
  Admin: [
    'users:read',
    'users:create',
    'memberships:manage',
    ...CATALOG_READ,
    ...CATALOG_WRITE,
  ],
  InventoryManager: [
    ...CATALOG_READ,
    'categories:write',
    'products:write',
    'suppliers:write',
    'warehouses:write',
  ],
  BranchManager: [
    ...CATALOG_READ,
    'products:write',
    'suppliers:write',
    'warehouses:write',
  ],
  Viewer: [...CATALOG_READ],
} as const;

export const CATALOG_PERMISSION_KEYS = [...CATALOG_READ, ...CATALOG_WRITE];
