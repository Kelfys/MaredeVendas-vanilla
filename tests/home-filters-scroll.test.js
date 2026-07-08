import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('home filters scroll', () => {
  let filters
  let scrollHandler

  beforeEach(() => {
    vi.resetModules()
    filters = {
      classList: { toggle: vi.fn() },
    }
    vi.stubGlobal('window', {
      scrollY: 0,
      addEventListener: vi.fn((event, handler) => {
        if (event === 'scroll') scrollHandler = handler
      }),
    })
    vi.stubGlobal('document', {
      getElementById: vi.fn((id) => (id === 'home-toolbar-filters' ? filters : null)),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('bindHomeFiltersScroll registers a passive scroll listener once', async () => {
    const { bindHomeFiltersScroll } = await import('../js/home-filters-scroll.js')
    bindHomeFiltersScroll()
    bindHomeFiltersScroll()
    expect(window.addEventListener).toHaveBeenCalledTimes(1)
    expect(window.addEventListener).toHaveBeenCalledWith('scroll', expect.any(Function), { passive: true })
  })

  it('hides filters after scrolling down on home feed', async () => {
    const { bindHomeFiltersScroll } = await import('../js/home-filters-scroll.js')
    bindHomeFiltersScroll()

    window.scrollY = 120
    scrollHandler()
    window.scrollY = 140
    scrollHandler()

    expect(filters.classList.toggle).toHaveBeenCalledWith('home-toolbar__filters--hidden', true)
  })

  it('shows filters again when scrolling up', async () => {
    const { bindHomeFiltersScroll } = await import('../js/home-filters-scroll.js')
    bindHomeFiltersScroll()

    window.scrollY = 140
    scrollHandler()
    window.scrollY = 120
    scrollHandler()

    expect(filters.classList.toggle).toHaveBeenCalledWith('home-toolbar__filters--hidden', false)
  })

  it('resetHomeFiltersScroll clears hidden state', async () => {
    const { bindHomeFiltersScroll, resetHomeFiltersScroll } = await import('../js/home-filters-scroll.js')
    bindHomeFiltersScroll()

    window.scrollY = 140
    scrollHandler()
    resetHomeFiltersScroll()

    expect(filters.classList.toggle).toHaveBeenCalledWith('home-toolbar__filters--hidden', false)
  })
})