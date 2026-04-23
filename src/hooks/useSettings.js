import { useState, useEffect } from 'react'
import { SPECS, EXP_CATS, PAY_METHODS } from '../constants/index.js'

export function useSettings(userId) {
  const key = userId ? `settings_${userId}` : null

  const DEFAULTS = { specs: SPECS, expCats: EXP_CATS, payMethods: PAY_METHODS, taxEnabled: true, businessType: 'osek_moreh', vatEnabled: true, vatRate: 17 }

  function load() {
    if (!key) return DEFAULTS
    try {
      const saved = localStorage.getItem(key)
      if (saved) return { ...DEFAULTS, ...JSON.parse(saved) }
    } catch {}
    return DEFAULTS
  }

  const [settings, setSettings] = useState(load)

  useEffect(() => {
    if (userId) setSettings(load())
  }, [userId])

  function save(updated) {
    setSettings(updated)
    if (key) localStorage.setItem(key, JSON.stringify(updated))
  }

  function addSpec(spec) {
    const s = spec.trim()
    if (!s || settings.specs.includes(s)) return
    save({ ...settings, specs: [...settings.specs, s] })
  }

  function removeSpec(spec) {
    save({ ...settings, specs: settings.specs.filter(s => s !== spec) })
  }

  function addExpCat(cat) {
    const c = cat.trim()
    if (!c || settings.expCats.includes(c)) return
    save({ ...settings, expCats: [...settings.expCats, c] })
  }

  function removeExpCat(cat) {
    save({ ...settings, expCats: settings.expCats.filter(c => c !== cat) })
  }

  function setPensionMonthly(amount) {
    save({ ...settings, pensionMonthly: parseFloat(amount) || 0 })
  }

  function setTaxEnabled(val) {
    save({ ...settings, taxEnabled: !!val })
  }

  function setBusinessType(val) {
    save({ ...settings, businessType: val })
  }

  function setVatEnabled(val) {
    save({ ...settings, vatEnabled: !!val })
  }

  function setVatRate(val) {
    const rate = parseFloat(val)
    if (!isNaN(rate) && rate > 0 && rate <= 100)
      save({ ...settings, vatRate: rate })
  }

  function addPayMethod(method) {
    const m = method.trim()
    if (!m || settings.payMethods.includes(m)) return
    save({ ...settings, payMethods: [...settings.payMethods, m] })
  }

  function removePayMethod(method) {
    save({ ...settings, payMethods: settings.payMethods.filter(m => m !== method) })
  }

  return {
    specs:      settings.specs,
    expCats:    settings.expCats,
    payMethods: settings.payMethods || PAY_METHODS,
    pensionMonthly: settings.pensionMonthly || 0,
    taxEnabled:     settings.taxEnabled !== false,
    businessType:   settings.businessType || 'osek_moreh',
    vatEnabled:     settings.vatEnabled !== false,
    vatRate:        settings.vatRate || 17,
    addSpec,        removeSpec,
    addExpCat,      removeExpCat,
    addPayMethod,   removePayMethod,
    setPensionMonthly,
    setTaxEnabled,   setBusinessType,
    setVatEnabled,   setVatRate,
  }
}
