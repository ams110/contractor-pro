import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar.json'
import he from './locales/he.json'
import en from './locales/en.json'

const STORAGE_KEY = 'cp_lang'

// اللغة الابتدائية: رابط الحملة `?lang=he/ar/en` يتقدّم على المحفوظ، حتى يصل
// الباحث العبري لصفحة عبرية مباشرة. بلا param → المحفوظ أو العربي الافتراضي.
// يُحسب هنا (أول import في main.jsx) قبل تهيئة أي مخزن يقرأ اللغة، فيراها الجميع
// (i18n + useAppStore) موحّدة من أول رندر.
function resolveInitialLang() {
  try {
    const urlLang = new URLSearchParams(window.location.search).get('lang')
    if (urlLang && ['ar', 'he', 'en'].includes(urlLang)) return urlLang
  } catch { /* تجاهل: قراءة الرابط غير متاحة */ }
  return localStorage.getItem(STORAGE_KEY) || 'ar'
}

const savedLang = resolveInitialLang()

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      he: { translation: he },
      en: { translation: en },
    },
    lng: savedLang,
    fallbackLng: 'ar',
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
    // في التطوير: نبّه على أي مفتاح ترجمة ناقص حتى لا يصل للإنتاج بصمت
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: import.meta.env.DEV
      ? (lng, ns, key) => console.warn(`[i18n] مفتاح ناقص: "${key}" (${Array.isArray(lng) ? lng.join(',') : lng})`)
      : undefined,
  })

export function setLanguage(lang) {
  i18n.changeLanguage(lang)
  localStorage.setItem(STORAGE_KEY, lang)

  const isRTL = lang === 'ar' || lang === 'he'
  document.documentElement.setAttribute('lang', lang)
  document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
  document.body.setAttribute('dir', isRTL ? 'rtl' : 'ltr')
}

export function getCurrentLang() {
  return i18n.language || savedLang
}

export function isRTL(lang) {
  const l = lang || getCurrentLang()
  return l === 'ar' || l === 'he'
}

// Apply initial direction on load
setLanguage(savedLang)

export default i18n
