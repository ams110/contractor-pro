import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))

export default defineConfig({
  define: {
    __APP_VERSION__:   JSON.stringify(pkg.version),
    __BUILD_DATE__:    JSON.stringify(new Date().toISOString().split('T')[0]),
  },
  plugins: [
    react(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
      manifest: {
        name: 'Contractor Pro',
        short_name: 'ContractorPro',
        description: 'إدارة مشاريع المقاولات',
        theme_color: '#F59E0B',
        background_color: '#0B1117',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  base: process.env.GITHUB_PAGES === 'true' ? '/contractor-pro/' : '/',
  server: { port: 3000 },
})
