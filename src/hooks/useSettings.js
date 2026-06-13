import { useState, useEffect } from 'react'
import { SPECS, EXP_CATS, PAY_METHODS } from '../constants/index.js'

const DEFAULT_TAX_MODULES = {
  vat:              true,
  incomeTax:        true,
  bituachLeumi:     true,
  workerDeductions: true,
  pensionCalc:      true,
  annualSummary:    true,
}

const DEFAULTS = {
  specs: SPECS, expCats: EXP_CATS, payMethods: PAY_METHODS,
  taxEnabled: true,
  taxModules: DEFAULT_TAX_MODULES,
  salaryAlerts: true,
  dailyDigest: true,
}

export function useSettings(userId) {
  const key = userId ? `settings_${userId}` : null

  function load() {
    if (!key) return DEFAULTS
    try {
      const saved = localStorage.getItem(key)
      if (saved) {
        const parsed = JSON.parse(saved)
        return {
          ...DEFAULTS,
          payMethods: PAY_METHODS,
          ...parsed,
          taxModules: { ...DEFAULT_TAX_MODULES, ...(parsed.taxModules || {}) },
        }
      }
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
  function removeSpec(spec) { save({ ...settings, specs: settings.specs.filter(s => s !== spec) }) }

  function addExpCat(cat) {
    const c = cat.trim()
    if (!c || settings.expCats.includes(c)) return
    save({ ...settings, expCats: [...settings.expCats, c] })
  }
  function removeExpCat(cat) { save({ ...settings, expCats: settings.expCats.filter(c => c !== cat) }) }

  function setPensionMonthly(amount) { save({ ...settings, pensionMonthly: parseFloat(amount) || 0 }) }

  function setTaxEnabled(val) { save({ ...settings, taxEnabled: !!val }) }

  function setTaxModule(moduleKey, val) {
    save({ ...settings, taxModules: { ...settings.taxModules, [moduleKey]: !!val } })
  }

  function setSalaryAlerts(val) { save({ ...settings, salaryAlerts: !!val }) }
  function setDailyDigest(val) { save({ ...settings, dailyDigest: !!val }) }

  function addPayMethod(method) {
    const m = method.trim()
    if (!m || settings.payMethods.includes(m)) return
    save({ ...settings, payMethods: [...settings.payMethods, m] })
  }
  function removePayMethod(method) { save({ ...settings, payMethods: settings.payMethods.filter(m => m !== method) }) }

  return {
    specs:          settings.specs,
    expCats:        settings.expCats,
    payMethods:     settings.payMethods || PAY_METHODS,
    pensionMonthly: settings.pensionMonthly || 0,
    taxEnabled:     settings.taxEnabled !== false,
    taxModules:     settings.taxModules || DEFAULT_TAX_MODULES,
    salaryAlerts:   settings.salaryAlerts !== false,
    dailyDigest:    settings.dailyDigest !== false,
    addSpec,        removeSpec,
    addExpCat,      removeExpCat,
    addPayMethod,   removePayMethod,
    setPensionMonthly,
    setTaxEnabled,
    setTaxModule,
    setSalaryAlerts,
    setDailyDigest,
  }
}
