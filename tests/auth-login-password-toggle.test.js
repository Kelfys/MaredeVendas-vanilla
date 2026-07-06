// @vitest-environment happy-dom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { expectPasswordToggleWorks } from './helpers/password-toggle.js'

function setupAuthMocks({ hash = '#/conta/entrar' } = {}) {
  vi.stubGlobal('window', {
    location: { hash, origin: 'http://localhost', pathname: '/' },
    scrollTo: vi.fn(),
  })
  vi.stubGlobal('requestAnimationFrame', (fn) => fn())

  vi.doMock('../js/api.js', () => ({
    signIn: vi.fn(),
    signUpCustomer: vi.fn(),
    signUp: vi.fn(),
    signInWithGoogle: vi.fn(),
    requestPasswordReset: vi.fn(),
    fetchCategories: vi.fn().mockResolvedValue([]),
    fetchNeighborhoods: vi.fn().mockResolvedValue([]),
    createStore: vi.fn(),
    fetchStoreByOwner: vi.fn(),
  }))
  vi.doMock('../js/state.js', () => ({
    setUser: vi.fn(),
    loadUser: vi.fn(),
    getUser: () => null,
  }))
  vi.doMock('../js/router.js', () => ({
    navigate: vi.fn(),
    getHashSection: () => null,
    routeHref: (path) => `#${path}`,
  }))
  vi.doMock('../js/rules-plans-panel.js', () => ({
    renderRulesAndPlansContent: () => '<div class="auth-info-panel"><h2 id="regras">Regras</h2></div>',
  }))
}

describe('password toggle on login pages', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('renderLogin (/conta/entrar)', async () => {
    setupAuthMocks({ hash: '#/conta/entrar' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderLogin } = await import('../js/pages/auth.js')
    await renderLogin(main)

    expect(main.innerHTML).toContain('type="password"')
    expectPasswordToggleWorks(main, { route: '/conta/entrar' })
  })

  it('renderMerchantLogin (/lojista/entrar)', async () => {
    setupAuthMocks({ hash: '#/lojista/entrar' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderMerchantLogin } = await import('../js/pages/auth.js')
    await renderMerchantLogin(main)

    expectPasswordToggleWorks(main, { route: '/lojista/entrar' })
  })

  it('renderAdminLogin (/admin/entrar)', async () => {
    setupAuthMocks({ hash: '#/admin/entrar' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderAdminLogin } = await import('../js/pages/auth.js')
    await renderAdminLogin(main)

    expect(main.innerHTML).toContain('id="login-form"')
    expectPasswordToggleWorks(main, { route: '/admin/entrar' })
  })

  it('renderModeratorLogin (/moderador/entrar)', async () => {
    setupAuthMocks({ hash: '#/moderador/entrar' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderModeratorLogin } = await import('../js/pages/auth.js')
    await renderModeratorLogin(main)

    expect(main.innerHTML).toContain('id="login-form"')
    expectPasswordToggleWorks(main, { route: '/moderador/entrar' })
  })
})

describe('password toggle on register pages', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('renderCustomerRegister (/conta/criar)', async () => {
    setupAuthMocks({ hash: '#/conta/criar' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderCustomerRegister } = await import('../js/pages/auth.js')
    await renderCustomerRegister(main)

    expect(main.innerHTML).toContain('id="register-form"')
    expect(main.innerHTML).toContain('type="password"')
    expectPasswordToggleWorks(main, { route: '/conta/criar' })
  })

  it('renderMerchantRegister (/lojista/cadastro — etapa de conta)', async () => {
    setupAuthMocks({ hash: '#/lojista/cadastro' })
    const main = document.createElement('main')
    document.body.appendChild(main)

    const { renderMerchantRegister } = await import('../js/pages/auth.js')
    await renderMerchantRegister(main)

    expect(main.innerHTML).toContain('id="merchant-signup"')
    expect(main.innerHTML).toContain('type="password"')
    expectPasswordToggleWorks(main, { route: '/lojista/cadastro' })
  })
})