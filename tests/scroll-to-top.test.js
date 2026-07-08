import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('scroll to top button', () => {
  let scrollHandler
  let button

  beforeEach(() => {
    vi.resetModules()
    button = {
      type: '',
      id: '',
      className: '',
      classList: { toggle: vi.fn(), remove: vi.fn() },
      setAttribute: vi.fn(),
      title: '',
      innerHTML: '',
      addEventListener: vi.fn(),
      getAttribute: vi.fn(),
    }
    const app = { appendChild: vi.fn((el) => { Object.assign(button, el); return el }) }
    vi.stubGlobal('window', {
      scrollY: 0,
      scrollTo: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        if (event === 'scroll') scrollHandler = handler
      }),
    })
    vi.stubGlobal('document', {
      getElementById: vi.fn((id) => (id === 'app' ? app : null)),
      createElement: vi.fn(() => button),
    })
    vi.doMock('../js/strings.js', () => ({
      t: (key) => (key === 'app.scrollToTop' ? 'Voltar ao topo' : key),
    }))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('initScrollToTop creates button and listens to scroll once', async () => {
    const { initScrollToTop } = await import('../js/scroll-to-top.js')
    initScrollToTop()
    initScrollToTop()
    expect(document.createElement).toHaveBeenCalledTimes(1)
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
    expect(button.setAttribute).toHaveBeenCalledWith('aria-label', 'Voltar ao topo')
  })

  it('shows button after scrolling down', async () => {
    const { initScrollToTop } = await import('../js/scroll-to-top.js')
    initScrollToTop()
    window.scrollY = 400
    scrollHandler()
    expect(button.classList.toggle).toHaveBeenCalledWith('scroll-to-top--visible', true)
  })

  it('resetScrollToTop hides the button', async () => {
    const { initScrollToTop, resetScrollToTop } = await import('../js/scroll-to-top.js')
    initScrollToTop()
    resetScrollToTop()
    expect(button.classList.remove).toHaveBeenCalledWith('scroll-to-top--visible')
  })
})