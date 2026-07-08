// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const customerUser = {
  id: 'cust-1',
  name: 'Cliente Demo',
  email: 'cliente@test.com',
  role: 'customer',
}

const promoteCustomerToMerchant = vi.fn().mockResolvedValue({ role: 'merchant' })
const fetchStoreByOwner = vi.fn().mockResolvedValue(null)
const fetchCategories = vi.fn().mockResolvedValue([{ id: 'cat-1', name: 'Geral' }])
const fetchNeighborhoods = vi.fn().mockResolvedValue([{ id: 'n-1', name: 'Centro', city: 'Rio', state: 'RJ' }])

function setupMocks() {
  vi.stubGlobal('window', {
    location: { hash: '#/lojista/cadastro', origin: 'http://localhost', pathname: '/' },
    scrollTo: vi.fn(),
  })

  vi.doMock('../js/state.js', () => ({
    getUser: vi.fn(() => customerUser),
    loadUser: vi.fn().mockResolvedValue({ ...customerUser, role: 'merchant' }),
    setUser: vi.fn(),
  }))
  vi.doMock('../js/api.js', () => ({
    promoteCustomerToMerchant,
    fetchStoreByOwner,
    fetchCategories,
    fetchNeighborhoods,
    createStore: vi.fn(),
    signUp: vi.fn(),
  }))
  vi.doMock('../js/router.js', () => ({
    routeHref: (path) => `#${path}`,
    navigate: vi.fn(),
  }))
}

describe('renderMerchantRegister for logged-in customer', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    promoteCustomerToMerchant.mockClear()
    fetchStoreByOwner.mockClear()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
    vi.doUnmock('../js/state.js')
    vi.doUnmock('../js/api.js')
    vi.doUnmock('../js/router.js')
  })

  it('promotes customer and shows store registration form', async () => {
    setupMocks()
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderMerchantRegister } = await import('../js/pages/auth.js')
    await renderMerchantRegister(main)

    expect(promoteCustomerToMerchant).toHaveBeenCalledTimes(1)
    expect(main.querySelector('#store-form')).toBeTruthy()
    expect(main.innerHTML).not.toContain('Acesso negado')
  })
})