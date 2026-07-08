/**
 * Esconde bairros e categorias da home ao rolar o feed para baixo; reaparecem ao rolar para cima.
 */
let lastScrollY = 0
let hidden = false
let bound = false

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