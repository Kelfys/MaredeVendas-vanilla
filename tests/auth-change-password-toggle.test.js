// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { expectPasswordToggleWorks } from './helpers/password-toggle.js'

const merchantUser = {
  id: '11111111-1111-4111-8111-111111110016',
  role: 'merchant',
  email: 'lojista@test.com',
  name: 'Lojista Teste',
}

const adminUser = {
  id: '22222222-2222-4222-8222-222222220001',
  role: 'admin',
  email: 'admin@test.com',
  name: 'Admin Teste',
}

const moderatorUser = {
  id: '33333333-3333-4333-8333-333333330001',
  role: 'moderator',
  email: 'moderador@test.com',
  name: 'Moderador Teste',
  neighborhood: { id: 'n1', name: 'Copacabana', city: 'Rio de Janeiro', state: 'RJ' },
}

const customerUser = {
  id: '44444444-4444-4444-8444-444444440001',
  role: 'customer',
  email: 'cliente@test.com',
  name: 'Cliente Teste',
  phone: '21999999999',
  address: 'Rua Teste, 1',
  delivery_period: 'tarde',
  birth_date: '1990-01-01',
}

const demoStore = {
  id: 'store-1',
  owner_id: merchantUser.id,
  name: 'Loja Demo',
  slug: 'loja-demo',
  status: 'approved',
  whatsapp: '5521999999999',
  payment_methods: ['pix'],
}

const noop = () => vi.fn().mockResolvedValue([])
const noopObj = () => vi.fn().mockResolvedValue({})
const noopNull = () => vi.fn().mockResolvedValue(null)
const noopUnsub = () => vi.fn(() => () => {})

function mockDb() {
  vi.doMock('../js/db.js', () => ({
    isSupabaseConfigured: () => false,
    getSupabase: () => null,
    requireClient: vi.fn(),
  }))
}

function setupMerchantMocks() {
  vi.stubGlobal('window', {
    location: { hash: '#/dashboard/conta', origin: 'http://localhost', pathname: '/' },
    scrollTo: vi.fn(),
  })
  vi.stubGlobal('requestAnimationFrame', (fn) => fn())
  mockDb()

  vi.doMock('../js/state.js', () => ({
    getUser: () => merchantUser,
    loadUser: vi.fn().mockResolvedValue(merchantUser),
    setMerchantNewOrdersCount: vi.fn(),
  }))
  vi.doMock('../js/api.js', () => ({
    fetchStoreByOwner: vi.fn().mockResolvedValue(demoStore),
    fetchMerchantProducts: noop(),
    fetchOrdersByStore: noop(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    deleteProduct: vi.fn(),
    updateStore: vi.fn(),
    fetchCategories: noop(),
    updatePassword: vi.fn(),
    fetchMerchantOrdersAnalytics: vi.fn().mockResolvedValue({ timeline: [] }),
    fetchStoreViewStats: noopObj(),
    fetchReviewsByStore: noop(),
    fetchStoreAds: noop(),
    createStoreAd: vi.fn(),
    updateOrderStatus: vi.fn(),
    fetchProductPriceHistory: noop(),
    countUnreadMerchantOrders: vi.fn().mockResolvedValue(0),
    subscribeToStoreOrders: noopUnsub(),
    createPlanChangeRequest: vi.fn(),
    fetchStorePendingPlanChangeRequest: noopNull(),
  }))
  vi.doMock('../js/router.js', () => ({
    routeHref: (path) => `#${path}`,
    navigate: vi.fn(),
  }))
}

function setupStaffMocks(user) {
  vi.stubGlobal('window', {
    location: { hash: user.role === 'admin' ? '#/admin/conta' : '#/moderador/conta', origin: 'http://localhost', pathname: '/' },
    scrollTo: vi.fn(),
  })
  vi.stubGlobal('requestAnimationFrame', (fn) => fn())
  mockDb()

  vi.doMock('../js/state.js', () => ({
    getUser: () => user,
    loadUser: vi.fn().mockResolvedValue(user),
    setAdminPendingCount: vi.fn(),
  }))
  vi.doMock('../js/api.js', () => ({
    fetchAdminMetrics: noopObj(),
    fetchAdminOrdersAnalytics: vi.fn().mockResolvedValue({ timeline: [] }),
    fetchAdminOrders: noop(),
    buildOrderPeriodSeries: vi.fn().mockReturnValue([]),
    getOrderPeriodCutoff: vi.fn(),
    fetchPendingStoreApprovals: noop(),
    approveStoreRegistration: vi.fn(),
    rejectStoreRegistration: vi.fn(),
    fetchPendingPlanChangeRequests: noop(),
    approvePlanChangeRequest: vi.fn(),
    rejectPlanChangeRequest: vi.fn(),
    updateModeratorPermissions: vi.fn(),
    updatePassword: vi.fn(),
    updateEmail: vi.fn(),
    fetchMerchants: noop(),
    fetchModerators: noop(),
    promoteUserToModerator: vi.fn(),
    demoteModerator: vi.fn(),
    fetchAllStoresAdmin: noop(),
    fetchAdminProducts: noop(),
    createStoreAsAdmin: vi.fn(),
    createProduct: vi.fn(),
    updateProduct: vi.fn(),
    updateStoreAsAdmin: vi.fn(),
    deleteProduct: vi.fn(),
    fetchCategories: noop(),
    fetchNeighborhoods: noop(),
    createNeighborhood: vi.fn(),
    updateNeighborhood: vi.fn(),
    deleteNeighborhood: vi.fn(),
    fetchLogoAccentMode: vi.fn().mockResolvedValue('normal'),
    setLogoAccentMode: vi.fn().mockResolvedValue('normal'),
  }))
  vi.doMock('../js/logo-accent.js', () => ({
    logoAccentOptionsHtml: () => '<option value="normal">Normal</option>',
    applyLogoAccentMode: vi.fn(),
    logoAccentModeLabel: () => 'Normal',
  }))
  vi.doMock('../js/router.js', () => ({
    routeHref: (path) => `#${path}`,
    navigate: vi.fn(),
  }))
}

function setupCustomerMocks() {
  vi.stubGlobal('window', {
    location: { hash: '#/favoritos', origin: 'http://localhost', pathname: '/' },
    scrollTo: vi.fn(),
  })
  vi.stubGlobal('requestAnimationFrame', (fn) => fn())
  mockDb()

  vi.doMock('../js/state.js', () => ({
    getUser: () => customerUser,
    setUser: vi.fn(),
    getCart: () => ({ items: [], storeId: null }),
    getCartItemCount: () => 0,
    setStore: vi.fn(),
    addItem: vi.fn(),
    openCart: vi.fn(),
  }))
  vi.doMock('../js/api.js', () => ({
    fetchFavorites: noop(),
    fetchLikedProductsByUser: noop(),
    fetchUserEngagementStats: () => Promise.resolve({ favoritesCount: 0, likesCount: 0 }),
    fetchOrdersByCustomer: noop(),
    updateCustomerProfile: vi.fn(),
    updatePassword: vi.fn(),
  }))
  vi.doMock('../js/router.js', () => ({
    routeHref: (path) => `#${path}`,
    navigate: vi.fn(),
    getCurrentPath: () => '/favoritos',
    getHashQueryParam: (name) => (name === 'tab' ? 'profile' : null),
  }))
  vi.doMock('../js/ui.js', () => ({
    renderStoreCard: () => '',
    renderFeedProductCard: () => '',
    renderEngagementStats: () => '',
  }))
}

describe('password toggle on change-password pages', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('merchant account (/dashboard/conta)', async () => {
    setupMerchantMocks()
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderMerchantDashboard } = await import('../js/pages/merchant.js')
    await renderMerchantDashboard(main, 'account')

    expect(main.querySelector('#merchant-password-form')).toBeTruthy()
    expectPasswordToggleWorks(main, { route: '/dashboard/conta', expectedCount: 2 })
  })

  it('admin account (/admin/conta)', async () => {
    setupStaffMocks(adminUser)
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderAdminDashboard } = await import('../js/pages/admin.js')
    await renderAdminDashboard(main, 'account')

    expect(main.querySelector('#admin-password-form')).toBeTruthy()
    expectPasswordToggleWorks(main, { route: '/admin/conta', expectedCount: 2 })
  })

  it('moderator account (/moderador/conta)', async () => {
    setupStaffMocks(moderatorUser)
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderModeratorDashboard } = await import('../js/pages/admin.js')
    await renderModeratorDashboard(main, 'account')

    expect(main.querySelector('#admin-password-form')).toBeTruthy()
    expectPasswordToggleWorks(main, { route: '/moderador/conta', expectedCount: 2 })
  })

  it('customer profile (/favoritos — perfil)', async () => {
    setupCustomerMocks()
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderFavorites } = await import('../js/pages/favorites.js')
    const renderPromise = renderFavorites(main)
    await vi.waitFor(() => {
      expect(main.querySelector('#customer-password-form')).toBeTruthy()
      expect(main.querySelector('.loading')).toBeFalsy()
    })
    await renderPromise

    expect(main.querySelector('[data-customer-tab="profile"]')?.classList.contains('active')).toBe(true)
    expectPasswordToggleWorks(main, { route: '/favoritos (perfil)', expectedCount: 2 })
  })
})