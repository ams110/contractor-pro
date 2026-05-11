import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

import ar from './locales/ar.json'
import he from './locales/he.json'
import en from './locales/en.json'

const STORAGE_KEY = 'cp_lang'

const savedLang = localStorage.getItem(STORAGE_KEY) || 'ar'

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
