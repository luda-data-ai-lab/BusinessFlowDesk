import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import { devApiPlugin } from './api/_devPlugin';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const allowedHosts = (env.ALLOWED_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim())
    .filter(Boolean);
  const port = Number(env.PORT) || undefined;
  return {
    plugins: [react(), devApiPlugin()],
    server: { allowedHosts, port },
    preview: { allowedHosts, port },
  };
});
