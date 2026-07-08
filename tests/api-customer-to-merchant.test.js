import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const updateUser = vi.fn().mockResolvedValue({ error: null })

function createMockSupabase({ role = 'customer' } = {}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            user_metadata: { name: 'Cliente', role },
          },
        },
      }),
      updateUser,
    },
    from: vi.fn((table) => {
      if (table !== 'users') return {}
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(function () { return this }),
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role: 'merchant' }, error: null }),
          })),
        })),
      }
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

describe('promoteCustomerToMerchant', () => {
  beforeEach(() => {
    updateUser.mockClear()
    vi.stubGlobal('window', {
      location: { pathname: '/', origin: 'http://localhost:8080' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  afterEach(() => {
    vi.resetModules()
    vi.doUnmock('../js/db.js')
  })

  it('promotes customer profile to merchant', async () => {
    const api = await loadApi(createMockSupabase({ role: 'customer' }))
    const result = await api.promoteCustomerToMerchant()
    expect(result).toEqual({ role: 'merchant' })
    expect(updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'merchant' }),
    })
  })

  it('is idempotent when user is already merchant', async () => {
    const api = await loadApi(createMockSupabase({ role: 'merchant' }))
    const result = await api.promoteCustomerToMerchant()
    expect(result).toEqual({ role: 'merchant' })
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('rejects admin accounts', async () => {
    const api = await loadApi(createMockSupabase({ role: 'admin' }))
    await expect(api.promoteCustomerToMerchant()).rejects.toThrow(/lojista/i)
  })
})