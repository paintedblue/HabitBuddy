import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
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
        globPatterns: ['**/*.{js,css,html,svg,png,glb,fbx,woff2}'],
        maximumFileSizeToCacheInBytes: 90 * 1024 * 1024
      }
    })
  ],
  server: {
    host: '0.0.0.0'
  }
});
