/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    single: vi.fn(resolve),
    insert: vi.fn(resolve),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(resolve),
        single: vi.fn(resolve),
      })),
    })),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createMockSupabase({
  storeOwnerId = 'other-owner',
  productOwnerId = 'other-owner',
  insertError = null,
} = {}) {
  return {
    from: vi.fn((table) => {
      if (table === 'stores') {
        return chainable(() => ({
          data: { id: 'store-1', owner_id: storeOwnerId },
          error: null,
        }))
      }
      if (table === 'products') {
        return chainable(() => ({
          data: { id: 'product-1', store_id: 'store-1', store: { owner_id: productOwnerId } },
          error: null,
        }))
      }
      if (table === 'content_reports') {
        const builder = chainable(() => ({ data: { id: 'report-1' }, error: insertError }))
        builder.insert = vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(async () => ({ data: { id: 'report-1', target_type: 'store' }, error: insertError })),
          })),
        }))
        return builder
      }
      return chainable(() => ({ data: null, error: null }))
    }),
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: 'staff-1' } } })),
    },
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

describe('content reports', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('submits a store report for another users store', async () => {
    const { submitStoreReport } = await loadApi(createMockSupabase())
    await expect(submitStoreReport('user-1', 'store-1', 'spam', 'detalhe')).resolves.toMatchObject({
      id: 'report-1',
    })
  })

  it('rejects reporting own store', async () => {
    const { submitStoreReport } = await loadApi(createMockSupabase({ storeOwnerId: 'user-1' }))
    await expect(submitStoreReport('user-1', 'store-1', 'spam')).rejects.toThrow(/própria loja/i)
  })

  it('rejects reporting own product', async () => {
    const { submitProductReport } = await loadApi(createMockSupabase({ productOwnerId: 'user-1' }))
    await expect(submitProductReport('user-1', 'product-1', 'spam')).rejects.toThrow(/própria loja/i)
  })

  it('requires a valid report reason', async () => {
    const { submitStoreReport } = await loadApi(createMockSupabase())
    await expect(submitStoreReport('user-1', 'store-1', 'invalid')).rejects.toThrow(/motivo/i)
  })

  it('allows merchants to report another store', async () => {
    const { submitStoreReport } = await loadApi(createMockSupabase({ storeOwnerId: 'other-owner' }))
    await expect(submitStoreReport('merchant-1', 'store-1', 'spam')).resolves.toMatchObject({
      id: 'report-1',
    })
  })
})