import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // свой service worker (src/sw.js): офлайн-кэш + push-уведомления
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      injectManifest: { globPatterns: ['**/*.{js,css,html}'] },
      includeAssets: ['favicon.svg', 'favicon.ico', 'favicon-32.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'badge-96.png'],
      manifest: {
        name: 'Семейные задания',
        short_name: 'Семья',
        description: 'Задания, баллы и награды для всей семьи',
        lang: 'ru',
        start_url: '/',
        display: 'standalone',
        background_color: '#0B0818',
        theme_color: '#4F46E5',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
