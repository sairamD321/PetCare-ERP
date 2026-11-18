import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import process from 'node:process';
import { defineConfig, loadEnv } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Trimmed: a stray space in .env.local ("BACKEND_URL= https://…") would break the proxy and image urls.
  const backend = env.BACKEND_URL?.trim().replace(/\/$/, '');

  return {
    plugins: [react()],
    build: {
      rolldownOptions: {
        output: {
          // Libraries change rarely: keep them in their own long-cached files, apart from app code.
          codeSplitting: {
            groups: [
              { name: 'react', test: /node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/, priority: 2 },
              { name: 'mantine', test: /node_modules[\\/]/, priority: 1 },
            ],
          },
        },
      },
    },
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    // Image urls from the backend are relative (/uploads/...); the app prefixes them with this.
    define: {
      'import.meta.env.VITE_BACKEND_URL': JSON.stringify((env.VITE_BACKEND_URL?.trim() || backend || '').replace(/\/$/, '')),
    },
    server: backend
      ? {
          // In development the app calls /api on its own origin and Vite forwards it to the backend.
          // This avoids CORS issues and lets us add the header localtunnel (loca.lt) needs.
          proxy: {
            '/api': {
              target: backend,
              changeOrigin: true,
              secure: true,
              rewrite: (path) => path.replace(/^\/api/, ''),
              headers: { 'bypass-tunnel-reminder': '1' },
            },
          },
        }
      : undefined,
  };
});
