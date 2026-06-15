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
        id: base,
        name: 'Contractor Pro — إدارة المقاولات',
        short_name: 'Contractor Pro',
        description: 'تطبيق إدارة المقاولات للمقاول العربي في إسرائيل: المشاريع، العمّال، أيام العمل، الرواتب، المصاريف، والضرائب.',
        categories: ['business', 'productivity', 'finance'],
        theme_color: '#F97316',
        background_color: '#07080F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: base,
        scope: base,
        lang: 'ar',
        dir: 'rtl',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'pwa-384.png', sizes: '384x384', type: 'image/png', purpose: 'any' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'maskable-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // لا نُحمّل مسبقاً مكتبات التصدير/الطباعة الثقيلة (تُستعمل عند الطلب فقط)
        // ولا أيقونة المتجر 1024 (لا تُعرض داخل التطبيق) — يقلّل حجم الـprecache.
        globIgnores: ['**/xlsx-*.js', '**/export-*.js', '**/html2canvas*.js', 'icon-1024.png'],
      },
    }),
  ],
  base,
  server: { port: 3000 },
  // اختبارات الوحدة (Vitest) — استثناء مواصفات Playwright E2E كي لا تُلتقط كـ"فشل"
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**'],
  },
  build: {
    // فصل المكتبات الكبيرة في chunks مستقلة → الصفحة الرئيسية تفتح أسرع،
    // والمكتبات تُحمّل من الكاش بين الإصدارات.
    rollupOptions: {
      output: {
        // دالة (لا كائن): ترسم مكتبات الفيندور لـchunks مستقلة للكاش، **دون**
        // إجبارها داخل رسم الاستيراد الثابت للمدخل. هيك المكتبات المستعملة فقط
        // عبر استيراد ديناميكي (مثل recharts داخل App الكسول) ما تُحمَّل/تُمهَّد على
        // صفحة الهبوط — تُحمَّل فقط مع الجزء الكسول الذي يحتاجها.
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (/node_modules\/(react|react-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('recharts')) return 'charts'
          if (id.includes('framer-motion')) return 'motion'
          if (id.includes('lucide-react')) return 'icons'
        },
      },
    },
  },
})
