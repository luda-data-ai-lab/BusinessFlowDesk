import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { devApiPlugin } from './api/_devPlugin';

export default defineConfig({
  plugins: [react(), devApiPlugin()],
});
