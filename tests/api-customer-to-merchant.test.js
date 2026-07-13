import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const updateUser = vi.fn().mockResolvedValue({ error: null })
const rpc = vi.fn()

function createMockSupabase({ role = 'customer' } = {}) {
  rpc.mockImplementation(async (fn) => {
    if (fn === 'promote_self_to_merchant') {
      if (role === 'customer') return { data: { role: 'merchant' }, error: null }
      if (role === 'merchant') return { data: { role: 'merchant' }, error: null }
      return { data: null, error: { message: 'only customers can become merchants' } }
    }
    return { data: null, error: null }
  })

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
    rpc,
    from: vi.fn((table) => {
      if (table !== 'users') return {}
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: { role }, error: null }),
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
    rpc.mockClear()
    vi.stubGlobal('window', {
      location: { pathname: '/', origin: 'http://localhost:8080' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.doUnmock('../js/db.js')
  })

  it('promotes customer profile to merchant via RPC', async () => {
    const api = await loadApi(createMockSupabase({ role: 'customer' }))
    const result = await api.promoteCustomerToMerchant()
    expect(result).toEqual({ role: 'merchant' })
    expect(rpc).toHaveBeenCalledWith('promote_self_to_merchant')
    expect(updateUser).toHaveBeenCalledWith({
      data: expect.objectContaining({ role: 'merchant' }),
    })
  })

  it('is idempotent when user is already merchant', async () => {
    const api = await loadApi(createMockSupabase({ role: 'merchant' }))
    const result = await api.promoteCustomerToMerchant()
    expect(result).toEqual({ role: 'merchant' })
    expect(rpc).not.toHaveBeenCalled()
    expect(updateUser).not.toHaveBeenCalled()
  })

  it('rejects admin accounts', async () => {
    const api = await loadApi(createMockSupabase({ role: 'admin' }))
    await expect(api.promoteCustomerToMerchant()).rejects.toThrow(/lojista/i)
    expect(rpc).not.toHaveBeenCalled()
  })
})
