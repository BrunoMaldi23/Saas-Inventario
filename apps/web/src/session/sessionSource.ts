import { createMockSessionSource } from './mockSessionSource';
import type { SessionSource } from './types';

/*
 * Punto único de conexión de la sesión. Cuando exista la API de autenticación,
 * reemplazar esta línea por una implementación basada en @inventario/api-client
 * y borrar mockSessionSource.ts. Ningún componente importa el mock directamente.
 */
export const sessionSource: SessionSource = createMockSessionSource();

export const isMockSession = true;
