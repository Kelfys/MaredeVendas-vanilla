/**
 * @vitest-environment happy-dom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

function chainable(resolveValue) {
  const resolve = () => Promise.resolve(resolveValue())
  const builder = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    delete: vi.fn(() => ({
      eq: vi.fn(resolve),
    })),
    then: (onFulfilled, onRejected) => resolve().then(onFulfilled, onRejected),
  }
  return builder
}

function createMockSupabase({ deleteError = null } = {}) {
  return {
    from: vi.fn((table) => {
      if (table === 'product_comments') {
        return chainable(() => ({ error: deleteError }))
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

describe('deleteProductComment', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('deletes a comment by id', async () => {
    const mockClient = createMockSupabase()
    const { deleteProductComment } = await loadApi(mockClient)
    await expect(deleteProductComment('comment-1')).resolves.toBeUndefined()
    expect(mockClient.from).toHaveBeenCalledWith('product_comments')
  })

  it('throws when delete fails', async () => {
    const { deleteProductComment } = await loadApi(createMockSupabase({
      deleteError: { message: 'permission denied' },
    }))
    await expect(deleteProductComment('comment-1')).rejects.toThrow('permission denied')
  })
})