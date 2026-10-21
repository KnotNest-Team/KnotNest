import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The proxy follows the backend's PORT (server/.env) so the two can never drift apart.
export default defineConfig(({ mode }) => {
  const serverEnv = loadEnv(mode, '../server', '');
  const port = process.env.PORT || serverEnv.PORT || 5001;
  const target = process.env.VITE_PROXY_TARGET || `http://localhost:${port}`;
  return {
    plugins: [react()],
    server: { port: 5173, proxy: { '/api': target, '/uploads': target } },
    preview: { port: 4173, proxy: { '/api': target, '/uploads': target } },
  };
});
