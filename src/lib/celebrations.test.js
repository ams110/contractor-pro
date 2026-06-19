import { describe, it, expect } from 'vitest'
import { CELEBRATION_VARIANTS, DEFAULT_VARIANT, celebrationConfig } from './celebrations.js'

describe('celebrations', () => {
  it('exposes the expected variants', () => {
    expect(Object.keys(CELEBRATION_VARIANTS).sort()).toEqual(
      ['milestone', 'money', 'success', 'win'].sort()
    )
  })

  it('every variant is well-formed', () => {
    for (const [name, cfg] of Object.entries(CELEBRATION_VARIANTS)) {
      expect(typeof cfg.icon, name).toBe('string')
      expect(typeof cfg.gradient, name).toBe('string')
      expect(Array.isArray(cfg.colors), name).toBe(true)
      expect(cfg.colors.length, name).toBeGreaterThan(0)
      expect(cfg.count, name).toBeGreaterThan(0)
      expect(cfg.duration, name).toBeGreaterThan(0)
      expect(cfg.gravity, name).toBeGreaterThan(0)
      expect(Array.isArray(cfg.haptic), name).toBe(true)
    }
  })

  it('celebrationConfig returns the matching config', () => {
    expect(celebrationConfig('money')).toBe(CELEBRATION_VARIANTS.money)
    expect(celebrationConfig('win')).toBe(CELEBRATION_VARIANTS.win)
  })

  it('falls back to the default variant for unknown / empty input', () => {
    const def = CELEBRATION_VARIANTS[DEFAULT_VARIANT]
    expect(celebrationConfig('nope')).toBe(def)
    expect(celebrationConfig(undefined)).toBe(def)
    expect(celebrationConfig('')).toBe(def)
  })
})
