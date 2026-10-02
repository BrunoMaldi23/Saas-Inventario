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
const INVENTORY_READ = 'inventory:read' as const;
const INVENTORY_WRITE = [
  'inventory:write',
  'inventory:adjust',
  'inventory:transfer',
] as const;

export const ROLE_PERMISSIONS = {
  Owner: [
    'users:read',
    'users:create',
    'memberships:manage',
    ...CATALOG_READ,
    ...CATALOG_WRITE,
    INVENTORY_READ,
    ...INVENTORY_WRITE,
  ],
  Admin: [
    'users:read',
    'users:create',
    'memberships:manage',
    ...CATALOG_READ,
    ...CATALOG_WRITE,
    INVENTORY_READ,
    ...INVENTORY_WRITE,
  ],
  InventoryManager: [
    ...CATALOG_READ,
    'categories:write',
    'products:write',
    'suppliers:write',
    'warehouses:write',
    INVENTORY_READ,
    ...INVENTORY_WRITE,
  ],
  BranchManager: [
    ...CATALOG_READ,
    'products:write',
    'suppliers:write',
    'warehouses:write',
    INVENTORY_READ,
    'inventory:write',
    'inventory:transfer',
  ],
  Viewer: [...CATALOG_READ, INVENTORY_READ],
} as const;

export const CATALOG_PERMISSION_KEYS = [...CATALOG_READ, ...CATALOG_WRITE];
