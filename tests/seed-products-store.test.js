import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('seed products store visibility', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      location: { pathname: '/', origin: 'http://localhost:8080' },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  async function loadConfig() {
    return import('../js/config.js')
  }

  it('detects seed store by slug string or object', async () => {
    const { isSeedProductsStore, SEED_PRODUCTS_STORE_SLUG } = await loadConfig()
    expect(isSeedProductsStore(SEED_PRODUCTS_STORE_SLUG)).toBe(true)
    expect(isSeedProductsStore({ slug: SEED_PRODUCTS_STORE_SLUG })).toBe(true)
    expect(isSeedProductsStore({ slug: 'loja-real', owner: { email: 'a@b.com' } })).toBe(false)
    expect(isSeedProductsStore({ slug: 'x', owner: { email: 'produtosfake@gmail.com' } })).toBe(true)
  })

  it('hides seed store from public marketplace listing helper', async () => {
    const { isPublicMarketplaceStore, SEED_PRODUCTS_STORE_SLUG } = await loadConfig()
    expect(isPublicMarketplaceStore({ slug: SEED_PRODUCTS_STORE_SLUG })).toBe(false)
    expect(isPublicMarketplaceStore({ slug: 'padaria-do-joao' })).toBe(true)
  })
})
