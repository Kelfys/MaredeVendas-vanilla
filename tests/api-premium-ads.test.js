import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const PREMIUM_ONLY_ERROR = 'Anúncios no feed são exclusivos do plano Premium.'
const FEE_ACK_ERROR = /Confirme a taxa de .* para criar um anúncio extra/

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    gte: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    single: vi.fn(resolve),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createMockSupabase({
  planId = 'premium',
  status = 'approved',
  subscriptionStatus = 'active',
  includedThisMonth = 0,
} = {}) {
  const insertSpy = vi.fn(() => chainable(() => ({
    data: { id: 'ad-new', title: 'Promo', message: 'Oferta especial hoje' },
    error: null,
  })))

  return {
    from: vi.fn((table) => {
      if (table === 'stores') {
        return chainable(() => ({
          data: { plan_id: planId, status, subscription_status: subscriptionStatus },
          error: null,
        }))
      }
      if (table === 'store_ads') {
        return {
          select: vi.fn((cols, opts) => {
            if (opts?.head) {
              return chainable(() => ({ count: includedThisMonth, error: null }))
            }
            return chainable(() => ({ data: { id: 'ad-1' }, error: null }))
          }),
          eq: vi.fn(function () { return this }),
          gte: vi.fn(function () { return this }),
          insert: insertSpy,
        }
      }
      return chainable(() => ({ data: null, error: null }))
    }),
    insertSpy,
  }
}

describe('createStoreAd plan limits', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/', origin: 'http://localhost' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('rejects ads for non-premium plans', async () => {
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => createMockSupabase({ planId: 'plus' })),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))
    vi.doMock('../js/uploads.js', () => ({
      uploadImage: vi.fn(),
      STORAGE_BUCKETS: { products: 'products' },
    }))

    const { createStoreAd } = await import('../js/api.js')
    await expect(createStoreAd('store-1', { title: 'Promo', message: 'Oferta especial hoje' }))
      .rejects.toThrow(PREMIUM_ONLY_ERROR)
  })

  it('rejects extra ad when fee is not acknowledged', async () => {
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => createMockSupabase({ planId: 'premium', includedThisMonth: 2 })),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))
    vi.doMock('../js/uploads.js', () => ({
      uploadImage: vi.fn(),
      STORAGE_BUCKETS: { products: 'products' },
    }))

    const { createStoreAd } = await import('../js/api.js')
    await expect(createStoreAd('store-1', { title: 'Promo', message: 'Oferta especial hoje' }))
      .rejects.toThrow(FEE_ACK_ERROR)
  })

  it('allows premium store under monthly included limit', async () => {
    const mock = createMockSupabase({ planId: 'premium', includedThisMonth: 1 })
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => mock),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))
    vi.doMock('../js/uploads.js', () => ({
      uploadImage: vi.fn(),
      STORAGE_BUCKETS: { products: 'products' },
    }))

    const { createStoreAd } = await import('../js/api.js')
    const ad = await createStoreAd('store-1', { title: 'Promo', message: 'Oferta especial hoje' })
    expect(ad.id).toBe('ad-new')
  })

  it('allows extra ad when fee is acknowledged', async () => {
    const mock = createMockSupabase({ planId: 'premium', includedThisMonth: 2 })
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => mock),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))
    vi.doMock('../js/uploads.js', () => ({
      uploadImage: vi.fn(),
      STORAGE_BUCKETS: { products: 'products' },
    }))

    const storeAdsTable = mock.from('store_ads')
    const { createStoreAd } = await import('../js/api.js')
    const ad = await createStoreAd('store-1', {
      title: 'Promo extra',
      message: 'Oferta especial hoje',
      feeAcknowledged: true,
    })
    expect(ad.id).toBe('ad-new')
    expect(storeAdsTable.insert).toHaveBeenCalledWith(expect.objectContaining({
      is_extra: true,
      fee_amount: 5,
      fee_acknowledged: true,
    }))
  })
})