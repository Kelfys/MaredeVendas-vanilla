/**
 * Auto-hide do cabeçalho no mobile (≤767px).
 *
 * Ao rolar para baixo, aplica `.header--scroll-hidden` em `#header` e
 * `header-scroll-hidden` em `<html>` (ver `css/styles.css`). Ao rolar para cima
 * ou voltar ao topo, o header reaparece.
 *
 * Não esconde com o menu hambúrguer aberto (`body--menu-open`). Ao esconder,
 * fecha o menu via `closeMobileMenu()` em `ui.js`.
 *
 * Inicialização: `initHeaderScroll()` em `app.js`. Reset em troca de rota:
 * `resetHeaderScroll()` em `router.js`.
 */
/** Mínimo de pixels de scroll para alternar visível/oculto (evita jitter). */
const SCROLL_DELTA = 10
/** Perto do topo da página o header permanece sempre visível. */
const TOP_REVEAL = 56
/** Mesmo breakpoint do CSS mobile (`@media (max-width: 767px)`). */
const MOBILE_QUERY = '(max-width: 767px)'

let lastScrollY = 0
let hidden = false
let bound = false
let mobileQuery = null

function isMobile() {
  return mobileQuery?.matches ?? window.innerWidth < 768
}

function applyHidden(value) {
  document.getElementById('header')?.classList.toggle('header--scroll-hidden', value)
  document.documentElement.classList.toggle('header-scroll-hidden', value)
}

function setHidden(value) {
  if (!isMobile()) {
    if (hidden) {
      hidden = false
      applyHidden(false)
    }
    return
  }

  if (document.body.classList.contains('body--menu-open')) {
    if (hidden) {
      hidden = false
      applyHidden(false)
    }
    return
  }

  if (hidden === value) return
  hidden = value
  applyHidden(value)

  if (value) {
    import('./ui.js').then(({ closeMobileMenu }) => closeMobileMenu()).catch(() => {})
  }
}

function onScroll() {
  if (!isMobile()) {
    setHidden(false)
    lastScrollY = window.scrollY
    return
  }

  if (document.body.classList.contains('body--menu-open')) {
    setHidden(false)
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

export function resetHeaderScroll() {
  lastScrollY = window.scrollY
  setHidden(false)
}

export function initHeaderScroll() {
  if (!mobileQuery) {
    mobileQuery = window.matchMedia(MOBILE_QUERY)
    mobileQuery.addEventListener('change', () => {
      if (!mobileQuery.matches) resetHeaderScroll()
    })
  }

  if (!bound) {
    bound = true
    window.addEventListener('scroll', onScroll, { passive: true })
  }

  resetHeaderScroll()
}