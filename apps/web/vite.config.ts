import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../../', '');
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
