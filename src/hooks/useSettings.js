import { useState, useEffect } from 'react'
import { SPECS, EXP_CATS } from '../constants/index.js'

export function useSettings(userId) {
  const key = userId ? `settings_${userId}` : null

  function load() {
    if (!key) return { specs: SPECS, expCats: EXP_CATS }
    try {
      const saved = localStorage.getItem(key)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { specs: SPECS, expCats: EXP_CATS }
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

  return {
    specs:    settings.specs,
    expCats:  settings.expCats,
    addSpec,  removeSpec,
    addExpCat, removeExpCat,
  }
}
