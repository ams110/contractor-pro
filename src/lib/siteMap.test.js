import { describe, it, expect } from 'vitest'
import {
  phaseWeight, nextPhase, buildingProgress, blockProgress, siteProgress, phaseTally,
  unitProgress, floorProgress, nextTradeState, phaseFromProgress, UNIT_TRADES,
  unitTone, floorUnits, nextUnitNames, buildUnitRows, replicaTargets, buildReplicaRows,
} from './siteMap.js'
import { C } from '../constants/index.js'

describe('siteMap pure helpers', () => {
  it('phaseWeight maps statuses to weights', () => {
    expect(phaseWeight('planned')).toBe(0)
    expect(phaseWeight('structure')).toBe(55)
    expect(phaseWeight('done')).toBe(100)
    expect(phaseWeight('unknown')).toBe(0) // fallback
  })

  it('nextPhase cycles through phases', () => {
    expect(nextPhase('planned')).toBe('foundation')
    expect(nextPhase('finishing')).toBe('done')
    expect(nextPhase('done')).toBe('planned') // wraps
  })

  it('buildingProgress averages floors when present', () => {
    const units = [
      { id: 'b1', level: 'building', parent_id: 'k1', status: 'planned' },
      { id: 'f1', level: 'floor', parent_id: 'b1', status: 'done' },       // 100
      { id: 'f2', level: 'floor', parent_id: 'b1', status: 'structure' },  // 55
    ]
    const b = units[0]
    expect(buildingProgress(b, units)).toBe(Math.round((100 + 55) / 2)) // 78
  })

  it('buildingProgress falls back to own status with no floors', () => {
    const units = [{ id: 'b1', level: 'building', parent_id: 'k1', status: 'finishing' }]
    expect(buildingProgress(units[0], units)).toBe(80)
  })

  it('blockProgress averages its buildings', () => {
    const units = [
      { id: 'k1', level: 'block', parent_id: null, status: 'planned' },
      { id: 'b1', level: 'building', parent_id: 'k1', status: 'done' },     // 100
      { id: 'b2', level: 'building', parent_id: 'k1', status: 'foundation' }, // 25
    ]
    expect(blockProgress(units[0], units)).toBe(Math.round((100 + 25) / 2)) // 63
  })

  it('siteProgress averages top-level blocks', () => {
    const units = [
      { id: 'k1', level: 'block', parent_id: null, status: 'planned' },
      { id: 'k2', level: 'block', parent_id: null, status: 'planned' },
      { id: 'b1', level: 'building', parent_id: 'k1', status: 'done' },     // block k1 = 100
      { id: 'b2', level: 'building', parent_id: 'k2', status: 'planned' },  // block k2 = 0
    ]
    expect(siteProgress(units)).toBe(50)
  })

  it('siteProgress returns 0 for empty', () => {
    expect(siteProgress([])).toBe(0)
  })

  it('there are exactly 5 unit trades', () => {
    expect(UNIT_TRADES.map(t => t.id)).toEqual(['structure', 'plumbing', 'electrical', 'finishing', 'handover'])
  })

  it('nextTradeState cycles todo→doing→done→todo', () => {
    expect(nextTradeState('todo')).toBe('doing')
    expect(nextTradeState('doing')).toBe('done')
    expect(nextTradeState('done')).toBe('todo')
    expect(nextTradeState(undefined)).toBe('doing') // missing = todo
  })

  it('unitProgress: each trade is a 20% share, doing = half', () => {
    expect(unitProgress({ trades: {} })).toBe(0)
    expect(unitProgress({ trades: { structure: 'done' } })).toBe(20)
    expect(unitProgress({ trades: { structure: 'doing' } })).toBe(10)
    expect(unitProgress({ trades: { structure: 'done', plumbing: 'done', electrical: 'done', finishing: 'done', handover: 'done' } })).toBe(100)
    expect(unitProgress({ trades: { structure: 'done', plumbing: 'doing' } })).toBe(30)
    expect(unitProgress({})).toBe(0) // no trades key
  })

  it('floorProgress averages its units when present, else falls back to phase', () => {
    const units = [
      { id: 'f1', level: 'floor', parent_id: 'b1', status: 'planned' },
      { id: 'u1', level: 'unit', parent_id: 'f1', trades: { structure: 'done', plumbing: 'done', electrical: 'done', finishing: 'done', handover: 'done' } }, // 100
      { id: 'u2', level: 'unit', parent_id: 'f1', trades: { structure: 'done' } }, // 20
    ]
    expect(floorProgress(units[0], units)).toBe(60) // (100+20)/2
  })

  it('floorProgress falls back to floor phase weight with no units', () => {
    const units = [{ id: 'f1', level: 'floor', parent_id: 'b1', status: 'structure' }]
    expect(floorProgress(units[0], units)).toBe(55)
  })

  it('buildingProgress rolls up through unit-driven floors', () => {
    const units = [
      { id: 'b1', level: 'building', parent_id: 'k1', status: 'planned' },
      { id: 'f1', level: 'floor', parent_id: 'b1', status: 'planned' },
      { id: 'u1', level: 'unit', parent_id: 'f1', trades: { structure: 'done', plumbing: 'done', electrical: 'done', finishing: 'done', handover: 'done' } }, // floor f1 = 100
      { id: 'f2', level: 'floor', parent_id: 'b1', status: 'foundation' }, // no units → 25
    ]
    expect(buildingProgress(units[0], units)).toBe(Math.round((100 + 25) / 2)) // 63
  })

  it('phaseFromProgress maps a percentage to the nearest lower phase', () => {
    expect(phaseFromProgress(0)).toBe('planned')
    expect(phaseFromProgress(30)).toBe('foundation') // >=25
    expect(phaseFromProgress(60)).toBe('structure')   // >=55
    expect(phaseFromProgress(85)).toBe('finishing')   // >=80
    expect(phaseFromProgress(100)).toBe('done')
  })

  it('unitTone: grey at 0, cyan in progress, green when done', () => {
    expect(unitTone(0)).toBe(C.textDim)
    expect(unitTone(40)).toBe(C.cyan)
    expect(unitTone(100)).toBe(C.success)
  })

  it('floorUnits returns only the floor apartments, sorted', () => {
    const units = [
      { id: 'u2', level: 'unit', parent_id: 'f1', sort_order: 1 },
      { id: 'u1', level: 'unit', parent_id: 'f1', sort_order: 0 },
      { id: 'x', level: 'unit', parent_id: 'f2', sort_order: 0 },
      { id: 'f1', level: 'floor', parent_id: 'b1', sort_order: 0 },
    ]
    expect(floorUnits(units, 'f1').map(u => u.id)).toEqual(['u1', 'u2'])
  })

  it('nextUnitNames continues from existing count', () => {
    expect(nextUnitNames(0, 3)).toEqual(['شقّة 1', 'شقّة 2', 'شقّة 3'])
    expect(nextUnitNames(2, 2)).toEqual(['شقّة 3', 'شقّة 4'])
    expect(nextUnitNames(5, 0)).toEqual([])
  })

  it('buildUnitRows builds N empty apartment rows under a floor', () => {
    const rows = buildUnitRows('f1', 1, 2)
    expect(rows).toEqual([
      { level: 'unit', name: 'شقّة 2', parent_id: 'f1', status: 'planned', trades: {} },
      { level: 'unit', name: 'شقّة 3', parent_id: 'f1', status: 'planned', trades: {} },
    ])
  })

  it('replicaTargets returns building floors that have no apartments (excluding source)', () => {
    const units = [
      { id: 'b1', level: 'building', parent_id: 'k1' },
      { id: 'f1', level: 'floor', parent_id: 'b1', sort_order: 0 }, // source (has units)
      { id: 'f2', level: 'floor', parent_id: 'b1', sort_order: 1 }, // empty → target
      { id: 'f3', level: 'floor', parent_id: 'b1', sort_order: 2 }, // already has units → skip
      { id: 'u1', level: 'unit', parent_id: 'f1', sort_order: 0 },
      { id: 'u3', level: 'unit', parent_id: 'f3', sort_order: 0 },
    ]
    expect(replicaTargets(units, 'b1', 'f1')).toEqual(['f2'])
  })

  it('buildReplicaRows copies source apartment names (reset progress) to each target', () => {
    const units = [
      { id: 'f1', level: 'floor', parent_id: 'b1' },
      { id: 'u1', level: 'unit', parent_id: 'f1', name: 'شقّة 1', sort_order: 0, trades: { structure: 'done' } },
      { id: 'u2', level: 'unit', parent_id: 'f1', name: 'شقّة 2', sort_order: 1 },
    ]
    const rows = buildReplicaRows(units, 'f1', ['f2', 'f3'])
    expect(rows).toHaveLength(4)
    expect(rows[0]).toEqual({ level: 'unit', name: 'شقّة 1', parent_id: 'f2', status: 'planned', trades: {} })
    expect(rows[3]).toEqual({ level: 'unit', name: 'شقّة 2', parent_id: 'f3', status: 'planned', trades: {} })
  })

  it('phaseTally counts buildings per phase', () => {
    const units = [
      { id: 'b1', level: 'building', parent_id: 'k1', status: 'done' },
      { id: 'b2', level: 'building', parent_id: 'k1', status: 'done' },
      { id: 'b3', level: 'building', parent_id: 'k1', status: 'structure' },
      { id: 'f1', level: 'floor', parent_id: 'b1', status: 'planned' }, // ignored
    ]
    const t = phaseTally(units)
    expect(t.done).toBe(2)
    expect(t.structure).toBe(1)
    expect(t.planned).toBe(0)
  })
})
