import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

const disablePwa = process.env.VITE_DISABLE_PWA === '1';

export default defineConfig({
  envDir: resolve(__dirname, '../..'),
  plugins: [
    react(),
    !disablePwa && VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: 'HabitBuddy',
        short_name: 'HabitBuddy',
        start_url: '/',
        display: 'standalone',
        background_color: '#fff8eb',
        theme_color: '#7ccf44',
        icons: [
          {
            src: '/pwa-icon.svg',
            sizes: '192x192',
            type: 'image/svg+xml'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      }
    })
  ].filter(Boolean),
  server: {
    host: '0.0.0.0'
  }
});
