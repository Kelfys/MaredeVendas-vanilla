/**
 * Auto-hide dos filtros de bairro e categoria na home (`#home-toolbar-filters`).
 *
 * Só atua quando a home está montada. A barra de busca permanece fixa; apenas
 * as chips de bairro/categoria recebem `.home-toolbar__filters--hidden`.
 *
 * Ligado em `bindHomeFiltersScroll()` (`home.js` após cada `paint()`).
 * Reset em troca de rota: `resetHomeFiltersScroll()` em `router.js`.
 */
let lastScrollY = 0
let hidden = false
let bound = false

/** Mesmos limiares de `header-scroll.js` para comportamento consistente. */
const SCROLL_DELTA = 10
const TOP_REVEAL = 56

function getFiltersEl() {
  return document.getElementById('home-toolbar-filters')
}

function setHidden(value) {
  if (hidden === value) return
  hidden = value
  getFiltersEl()?.classList.toggle('home-toolbar__filters--hidden', value)
}

export function showHomeFilters() {
  setHidden(false)
}

export function resetHomeFiltersScroll() {
  lastScrollY = window.scrollY
  setHidden(false)
}

function onScroll() {
  const filters = getFiltersEl()
  if (!filters) {
    if (hidden) setHidden(false)
    lastScrollY = window.scrollY
    return
  }

  const y = window.scrollY
  const delta = y - lastScrollY

  if (y <= TOP_REVEAL) {
    setHidden(false)
  } else if (delta > SCROLL_DELTA) {
    setHidden(true)
  } else if (delta < -SCROLL_DELTA) {
    setHidden(false)
  }

  lastScrollY = y
}

export function bindHomeFiltersScroll() {
  if (!bound) {
    bound = true
    window.addEventListener('scroll', onScroll, { passive: true })
  }
  resetHomeFiltersScroll()
}