import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { UPSTREAMS, upstreamFor } from './worker/upstream.js';

// The store calls its own /api/<environment>/…; in development and preview,
// Vite forwards those calls to Atli's API, as worker/index.js does in production.
const api = Object.fromEntries(
  (Object.keys(UPSTREAMS) as (keyof typeof UPSTREAMS)[]).map((environment) => [
    `/api/${environment}`,
    {
      target: upstreamFor(environment, process.env),
      changeOrigin: true,
      rewrite: (path: string) => path.replace(`/api/${environment}`, ''),
    },
  ]),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
});
