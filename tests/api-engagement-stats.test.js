/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createStatsMockSupabase({
  favoritesCount = 0,
  productIds = ['p1', 'p2'],
  likesCount = 0,
  favoritesTable = 'favorites',
  favoritesRows = null,
  productRows = null,
  likeRows = null,
} = {}) {
  return {
    from: vi.fn((table) => {
      if (table === favoritesTable) {
        if (favoritesRows) {
          return chainable(() => ({ data: favoritesRows, error: null }))
        }
        return chainable(() => ({ count: favoritesCount, error: null }))
      }
      if (table === 'products') {
        if (productRows) {
          return chainable(() => ({ data: productRows, error: null }))
        }
        return chainable(() => ({
          data: productIds.map((id) => ({ id, store_id: 'store-1', likes_adjustment: 0 })),
          error: null,
        }))
      }
      if (table === 'product_likes') {
        if (likeRows) {
          return chainable(() => ({ data: likeRows, error: null }))
        }
        return chainable(() => ({ count: likesCount, error: null }))
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

describe('engagement stats', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('fetchStoreEngagementStats returns favorites and product likes totals', async () => {
    const { fetchStoreEngagementStats } = await loadApi(createStatsMockSupabase({
      favoritesCount: 7,
      productIds: ['p1', 'p2'],
      likeRows: [
        ...Array.from({ length: 15 }, () => ({ product_id: 'p1' })),
        ...Array.from({ length: 8 }, () => ({ product_id: 'p2' })),
      ],
    }))
    await expect(fetchStoreEngagementStats('store-1')).resolves.toEqual({
      favoritesCount: 7,
      likesCount: 23,
    })
  })

  it('fetchStoreEngagementStats returns zero likes without products', async () => {
    const { fetchStoreEngagementStats } = await loadApi(createStatsMockSupabase({
      favoritesCount: 2,
      productIds: [],
      likesCount: 99,
    }))
    await expect(fetchStoreEngagementStats('store-1')).resolves.toEqual({
      favoritesCount: 2,
      likesCount: 0,
    })
  })

  it('attachStoreEngagementStats aggregates favorites and likes per store', async () => {
    const { attachStoreEngagementStats } = await loadApi(createStatsMockSupabase({
      favoritesRows: [
        { store_id: 'store-1' },
        { store_id: 'store-1' },
        { store_id: 'store-2' },
      ],
      productRows: [
        { id: 'p1', store_id: 'store-1', likes_adjustment: 0 },
        { id: 'p2', store_id: 'store-1', likes_adjustment: 0 },
        { id: 'p3', store_id: 'store-2', likes_adjustment: 0 },
      ],
      likeRows: [
        { product_id: 'p1' },
        { product_id: 'p1' },
        { product_id: 'p3' },
      ],
    }))

    await expect(attachStoreEngagementStats([
      { id: 'store-1', name: 'A' },
      { id: 'store-2', name: 'B' },
    ])).resolves.toEqual([
      { id: 'store-1', name: 'A', favorites_count: 2, likes_count: 2 },
      { id: 'store-2', name: 'B', favorites_count: 1, likes_count: 1 },
    ])
  })

  it('fetchStores marketplaceVisible attaches favorites_count and likes_count', async () => {
    const storeRows = [
      {
        id: 'store-1',
        name: 'A',
        status: 'approved',
        subscription_status: 'active',
        plan_id: 'free',
        created_at: '2024-01-01T00:00:00Z',
      },
      {
        id: 'store-2',
        name: 'B',
        status: 'approved',
        subscription_status: 'trialing',
        plan_id: 'plus',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const storesBuilder = {
      select: vi.fn(function select() { return this }),
      order: vi.fn(function order() { return this }),
      eq: vi.fn(function eq() { return this }),
      in: vi.fn(function inn() { return this }),
      limit: vi.fn(function limit() { return this }),
      then: (onFulfilled, onRejected) => Promise.resolve({ data: storeRows, error: null }).then(onFulfilled, onRejected),
    }

    const mockClient = {
      from: vi.fn((table) => {
        if (table === 'stores') return storesBuilder
        if (table === 'favorites') {
          return chainable(() => ({
            data: [
              { store_id: 'store-1' },
              { store_id: 'store-1' },
              { store_id: 'store-2' },
            ],
            error: null,
          }))
        }
        if (table === 'products') {
          return chainable(() => ({
            data: [
              { id: 'p1', store_id: 'store-1', likes_adjustment: 0 },
              { id: 'p3', store_id: 'store-2', likes_adjustment: 0 },
            ],
            error: null,
          }))
        }
        if (table === 'product_likes') {
          return chainable(() => ({
            data: [{ product_id: 'p1' }, { product_id: 'p1' }, { product_id: 'p3' }],
            error: null,
          }))
        }
        return chainable(() => ({ data: null, error: null }))
      }),
    }

    const { fetchStores } = await loadApi(mockClient)
    const result = await fetchStores({ marketplaceVisible: true })

    expect(result).toEqual([
      expect.objectContaining({ id: 'store-1', favorites_count: 2, likes_count: 2 }),
      expect.objectContaining({ id: 'store-2', favorites_count: 1, likes_count: 1 }),
    ])
  })

  it('fetchUserEngagementStats returns user favorites and likes given', async () => {
    const { fetchUserEngagementStats } = await loadApi(createStatsMockSupabase({
      favoritesCount: 4,
      likesCount: 11,
    }))
    await expect(fetchUserEngagementStats('user-1')).resolves.toEqual({
      favoritesCount: 4,
      likesCount: 11,
    })
  })
})