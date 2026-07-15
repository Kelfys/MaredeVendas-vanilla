import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('getProductContactWhatsapp', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { pathname: '/', origin: 'http://localhost:8080' },
      localStorage: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('prefers product.whatsapp over store.whatsapp', async () => {
    const { getProductContactWhatsapp } = await import('../js/state.js')
    expect(getProductContactWhatsapp({
      whatsapp: '21988887777',
      store: { whatsapp: '21911112222' },
    })).toBe('21988887777')
  })

  it('falls back to store.whatsapp', async () => {
    const { getProductContactWhatsapp } = await import('../js/state.js')
    expect(getProductContactWhatsapp({
      store: { whatsapp: '21911112222' },
    })).toBe('21911112222')
  })

  it('returns empty when neither is set', async () => {
    const { getProductContactWhatsapp } = await import('../js/state.js')
    expect(getProductContactWhatsapp({})).toBe('')
  })
})
