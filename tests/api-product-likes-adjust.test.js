/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeProductLikesCount } from '../js/utils.js'

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(resolve),
    update: vi.fn(() => ({
      eq: vi.fn(resolve),
    })),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createMockSupabase({
  likesAdjustment = 0,
  organicCount = 3,
} = {}) {
  let adjustment = likesAdjustment

  return {
    from: vi.fn((table) => {
      if (table === 'products') {
        const builder = chainable(() => ({
          data: { id: 'product-1', likes_adjustment: adjustment },
          error: null,
        }))
        builder.update = vi.fn((payload) => {
          adjustment = payload.likes_adjustment
          return {
            eq: vi.fn(async () => ({ error: null })),
          }
        })
        return builder
      }
      if (table === 'product_likes') {
        return chainable(() => ({ count: organicCount, error: null }))
      }
      return chainable(() => ({ data: null, error: null }))
    }),
  }
}

async function loadApi(mockClient) {
  vi.resetModules()
  vi.doMock('../js/db.js', () => ({
    requireClient: vi.fn().mockResolvedValue(mockClient),
    isSupabaseConfigured: () => true,
    getSupabase: vi.fn(),
  }))
  return import('../js/api.js')
}

describe('computeProductLikesCount', () => {
  it('sums organic likes and admin adjustment without going below zero', () => {
    expect(computeProductLikesCount(5, 2)).toBe(7)
    expect(computeProductLikesCount(2, -5)).toBe(0)
  })
})

describe('adjustProductLikes', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('increases displayed likes via adjustment', async () => {
    const { adjustProductLikes } = await loadApi(createMockSupabase({ organicCount: 4, likesAdjustment: 1 }))
    await expect(adjustProductLikes('product-1', 2)).resolves.toEqual({
      likes_count: 7,
      likes_adjustment: 3,
      organic_likes_count: 4,
    })
  })

  it('decreases displayed likes without going below zero', async () => {
    const { adjustProductLikes } = await loadApi(createMockSupabase({ organicCount: 2, likesAdjustment: 0 }))
    await expect(adjustProductLikes('product-1', -5)).resolves.toEqual({
      likes_count: 0,
      likes_adjustment: -2,
      organic_likes_count: 2,
    })
  })
})