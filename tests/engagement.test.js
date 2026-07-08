import { describe, it, expect } from 'vitest'
import { getProductEngagementWeight, getStoreEngagementBoost, computeProductLikesCount } from '../js/utils.js'

const NOW = Date.parse('2026-07-01T12:00:00Z')

describe('product engagement weight', () => {
  it('ranks more liked products higher', () => {
    const few = { created_at: '2025-06-01T00:00:00Z', likes_count: 2 }
    const many = { created_at: '2025-06-01T00:00:00Z', likes_count: 20 }
    expect(getProductEngagementWeight(many, NOW)).toBeGreaterThan(getProductEngagementWeight(few, NOW))
  })

  it('uses diminishing returns for very high like counts', () => {
    const mid = { created_at: '2025-06-01T00:00:00Z', likes_count: 10 }
    const viral = { created_at: '2025-06-01T00:00:00Z', likes_count: 1000 }
    const midWeight = getProductEngagementWeight(mid, NOW)
    const viralWeight = getProductEngagementWeight(viral, NOW)
    expect(viralWeight).toBeGreaterThan(midWeight)
    expect(viralWeight - midWeight).toBeLessThan(50)
  })

  it('boosts newer products within the new window', () => {
    const old = { created_at: '2025-01-01T00:00:00Z', likes_count: 0 }
    const fresh = { created_at: '2026-06-28T00:00:00Z', likes_count: 0 }
    expect(getProductEngagementWeight(fresh, NOW)).toBeGreaterThan(getProductEngagementWeight(old, NOW))
  })
})

describe('display likes count', () => {
  it('combines organic likes with admin adjustment', () => {
    expect(computeProductLikesCount(10, 3)).toBe(13)
    expect(computeProductLikesCount(1, -4)).toBe(0)
  })
})

describe('store engagement boost', () => {
  it('ranks stores with more favorites and likes higher', () => {
    const quiet = { favorites_count: 1, likes_count: 2 }
    const popular = { favorites_count: 25, likes_count: 50 }
    expect(getStoreEngagementBoost(popular)).toBeGreaterThan(getStoreEngagementBoost(quiet))
  })

  it('uses diminishing returns for very high store engagement', () => {
    const mid = { favorites_count: 10, likes_count: 20 }
    const viral = { favorites_count: 1000, likes_count: 5000 }
    const diff = getStoreEngagementBoost(viral) - getStoreEngagementBoost(mid)
    expect(diff).toBeGreaterThan(0)
    expect(diff).toBeLessThan(3)
  })
})