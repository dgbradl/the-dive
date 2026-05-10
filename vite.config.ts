/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'sprites/*.png',
        'textures/*.png',
        'brand/*.svg',
      ],
      manifest: {
        name: 'The Dive',
        short_name: 'The Dive',
        description: 'Run a sepia-tavern dive bar — pick scenarios, pour drinks, survive the lease.',
        theme_color: '#1a120a',
        background_color: '#1a120a',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          // The favicon.svg is scalable so it covers both 192 and 512 install
          // sizes plus any density Android picks. Maskable lets adaptive
          // launchers crop without clipping the wordmark.
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
