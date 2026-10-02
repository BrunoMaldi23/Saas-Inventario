import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/*
 * Lee los puertos desde el .env de la raíz sin usar loadEnv(): loadEnv copia
 * NODE_ENV del archivo a process.env.VITE_USER_NODE_ENV y, con
 * NODE_ENV=development, Vite genera un build de producción en modo desarrollo
 * (React dev, código solo-DEV incluido y bundle ~2x).
 */
function readRootEnv(): Record<string, string | undefined> {
  const file = new URL('../../.env', import.meta.url);
  const fromFile = existsSync(file) ? parseEnv(readFileSync(file, 'utf8')) : {};
  return { ...fromFile, ...process.env };
}

export default defineConfig(() => {
  const env = readRootEnv();
  const apiPort = Number(env.API_PORT || 3000);
  const webPort = Number(env.WEB_PORT || 5173);
  return {
    plugins: [react()],
    server: {
      port: webPort,
      strictPort: true,
      proxy: { '/api': `http://127.0.0.1:${apiPort}` },
    },
  };
});
