export const ROLE_PERMISSIONS = {
  Owner: ['users:read', 'users:create', 'memberships:manage'],
  Admin: ['users:read', 'users:create', 'memberships:manage'],
  InventoryManager: [],
  BranchManager: [],
  Viewer: [],
} as const;
