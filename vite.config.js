import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf8'))

// GitHub Pages يُخدَم من /contractor-pro/ — يُفعَّل عبر GITHUB_PAGES في الـ workflow.
// أي نشر آخر (Vercel / محلي) يبقى على الجذر '/'.
const base = process.env.GITHUB_PAGES === 'true' ? '/contractor-pro/' : '/'

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
        start_url: base,
        scope: base,
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
  base,
  server: { port: 3000 },
  build: {
    // فصل المكتبات الكبيرة في chunks مستقلة → الصفحة الرئيسية تفتح أسرع،
    // والمكتبات تُحمّل من الكاش بين الإصدارات.
    rollupOptions: {
      output: {
        manualChunks: {
          react:  ['react', 'react-dom'],
          charts: ['recharts'],
          motion: ['framer-motion'],
          icons:  ['lucide-react'],
        },
      },
    },
  },
})
