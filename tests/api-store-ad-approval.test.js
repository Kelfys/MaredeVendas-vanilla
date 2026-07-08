import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const NOT_PENDING_ERROR = 'Este anúncio não está mais aguardando aprovação.'

function createMockSupabase(updateResult) {
  const builder = {
    update: vi.fn(function () { return this }),
    eq: vi.fn(function () { return this }),
    select: vi.fn(function () { return this }),
    single: vi.fn(() => Promise.resolve(updateResult)),
  }
  return {
    from: vi.fn(() => builder),
    builder,
  }
}

describe('store ad approval', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { location: { pathname: '/', origin: 'http://localhost' } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('approveStoreAd sets approved status and expiry', async () => {
    const approvedAd = {
      id: 'ad-1',
      status: 'approved',
      approved_at: '2026-07-08T12:00:00.000Z',
      expires_at: '2026-07-09T12:00:00.000Z',
      store: { id: 'store-1', name: 'Loja Teste' },
    }
    const mock = createMockSupabase({ data: approvedAd, error: null })
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => mock),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))

    const { approveStoreAd } = await import('../js/api.js')
    const result = await approveStoreAd('ad-1')
    expect(result.status).toBe('approved')
    expect(result.expires_at).toBeTruthy()
    expect(mock.builder.update).toHaveBeenCalledWith(expect.objectContaining({
      status: 'approved',
      expires_at: expect.any(String),
    }))
  })

  it('rejectStoreAd sets rejected status', async () => {
    const rejectedAd = {
      id: 'ad-1',
      status: 'rejected',
      rejected_at: '2026-07-08T12:00:00.000Z',
      store: { id: 'store-1', name: 'Loja Teste' },
    }
    const mock = createMockSupabase({ data: rejectedAd, error: null })
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => mock),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))

    const { rejectStoreAd } = await import('../js/api.js')
    const result = await rejectStoreAd('ad-1')
    expect(result.status).toBe('rejected')
    expect(mock.builder.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'rejected' }))
  })

  it('approveStoreAd throws when ad is not pending', async () => {
    const mock = createMockSupabase({ data: null, error: null })
    vi.doMock('../js/db.js', () => ({
      requireClient: vi.fn(async () => mock),
      getSupabase: vi.fn(),
      isSupabaseConfigured: () => true,
    }))

    const { approveStoreAd } = await import('../js/api.js')
    await expect(approveStoreAd('ad-missing')).rejects.toThrow(NOT_PENDING_ERROR)
  })
})