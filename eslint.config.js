import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', 'dev-dist', 'node_modules'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.browser,
        ...globals.node,
        // Build-time constants injected by Vite's `define`
        __APP_VERSION__: 'readonly',
        __BUILD_DATE__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'no-unused-vars': ['warn', { varsIgnorePattern: '^[A-Z_]' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      // Keep the rule that catches genuine crashes as an error...
      'react-hooks/rules-of-hooks': 'error',
      // ...but downgrade the advisory react-hooks@7 rules to warnings so the
      // existing codebase lints clean. Fix these incrementally over time.
      'react-hooks/exhaustive-deps': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
    },
  },
  // Service worker runs in worker scope
  {
    files: ['src/sw.js'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
]
