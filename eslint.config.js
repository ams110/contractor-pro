import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'

// إعداد ESLint (flat config) — يركّز على أخطاء حقيقية (قواعد React Hooks، متغيّرات
// غير معرّفة) مع إبقاء التحذيرات الأسلوبية غير حاجبة.
export default [
  {
    ignores: [
      'dist/**', 'dev-dist/**', 'node_modules/**',
      'supabase/functions/**',   // Deno runtime (بيئة مختلفة)
      'tests/e2e/**',            // Playwright
      'scripts/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.serviceworker,
        __APP_VERSION__: 'readonly',
        __BUILD_DATE__: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },
]
