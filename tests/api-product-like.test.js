/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

const OWN_STORE_ERROR = 'Você não pode curtir produtos da sua própria loja.'
const OWN_FAVORITE_ERROR = 'Você não pode favoritar a sua própria loja.'

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    maybeSingle: vi.fn(resolve),
    insert: vi.fn(resolve),
    delete: vi.fn(() => ({
      eq: vi.fn(resolve),
    })),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createMockSupabase({ productOwnerId = 'other-owner', storeOwnerId = 'other-owner' } = {}) {
  const likes = []
  const favorites = []

  return {
    from: vi.fn((table) => {
      if (table === 'products') {
        return chainable(() => ({
          data: { id: 'product-1', store: { owner_id: productOwnerId } },
          error: null,
        }))
      }
      if (table === 'stores') {
        return chainable(() => ({
          data: { owner_id: storeOwnerId },
          error: null,
        }))
      }
      if (table === 'product_likes') {
        const builder = chainable(() => {
          const row = likes.find((l) => l.user_id === 'merchant-1' && l.product_id === 'product-1')
          return { data: row ?? null, error: null }
        })
        builder.insert = vi.fn(async (row) => {
          likes.push({ id: 'like-1', ...row })
          return { error: null }
        })
        builder.delete = vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        }))
        return builder
      }
      if (table === 'favorites') {
        const builder = chainable(() => ({ data: null, error: null }))
        builder.insert = vi.fn(async (row) => {
          favorites.push({ id: 'fav-1', ...row })
          return { error: null }
        })
        builder.delete = vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        }))
        return builder
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

describe('merchant engagement rules', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('rejects liking own store products', async () => {
    const { toggleProductLike } = await loadApi(createMockSupabase({ productOwnerId: 'merchant-1' }))
    await expect(toggleProductLike('merchant-1', 'product-1')).rejects.toThrow(OWN_STORE_ERROR)
  })

  it('allows liking another store products', async () => {
    const { toggleProductLike } = await loadApi(createMockSupabase({ productOwnerId: 'other-owner' }))
    await expect(toggleProductLike('merchant-1', 'product-1')).resolves.toBe(true)
  })

  it('rejects favoriting own store', async () => {
    const { toggleFavorite } = await loadApi(createMockSupabase({ storeOwnerId: 'merchant-1' }))
    await expect(toggleFavorite('merchant-1', 'store-1')).rejects.toThrow(OWN_FAVORITE_ERROR)
  })

  it('allows merchants to favorite other stores', async () => {
    const { toggleFavorite } = await loadApi(createMockSupabase({ storeOwnerId: 'other-owner' }))
    await expect(toggleFavorite('merchant-1', 'store-1')).resolves.toBe(true)
  })
})