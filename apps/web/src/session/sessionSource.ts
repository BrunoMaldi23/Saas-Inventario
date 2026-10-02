import {
  getMe,
  listTenants,
  login,
  logout,
  selectTenant,
} from '@inventario/api-client';
import { createApiSessionSource } from './apiSessionSource';
import type { SessionSource } from './types';

/** Punto único de conexión de la sesión con la API real. */
export const sessionSource: SessionSource = createApiSessionSource({
  getMe,
  login,
  logout,
  listTenants,
  selectTenant,
});
