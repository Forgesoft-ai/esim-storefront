import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { upstreamFor } from './worker/upstream.js';

// The store calls its own /api/…; in development and preview, Vite forwards
// those calls to Atli's API, as worker/index.js does in production.
const api = {
  '/api': {
    target: upstreamFor(process.env.VITE_ATLI_ENV, process.env.VITE_ATLI_API_BASE),
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/api/, ''),
  },
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
});
