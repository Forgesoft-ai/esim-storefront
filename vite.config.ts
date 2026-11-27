import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the store under /esim-storefront/; locally it's at /.
  // The deploy workflow sets BASE_PATH (.github/workflows/pages.yml).
  base: process.env.BASE_PATH ?? '/',
  plugins: [react()],
});
