import { SetMetadata } from '@nestjs/common';

export const PUBLIC_KEY = 'access:public';
export const NO_TENANT_KEY = 'access:no-tenant';
export const PERMISSION_KEY = 'access:permission';

export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const NoTenant = () => SetMetadata(NO_TENANT_KEY, true);
export const RequirePermission = (permission: string) =>
  SetMetadata(PERMISSION_KEY, permission);
