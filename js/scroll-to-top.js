/**
 * Botão flutuante ↑ para voltar ao topo e atualizar a rota atual.
 *
 * Visível após `SHOW_AFTER` px de scroll. No clique: `scrollTo(0)` + `render()`
 * do router (mesmo efeito do botão ↻ nos painéis staff).
 *
 * Inicialização: `initScrollToTop()` em `app.js`. Reset em troca de rota:
 * `resetScrollToTop()` em `router.js`.
 */
import { t } from './strings.js'

/** Distância mínima de scroll antes de exibir o botão. */
const SHOW_AFTER = 280
let button = null
let bound = false

function updateVisibility() {
  if (!button) return
  button.classList.toggle('scroll-to-top--visible', window.scrollY > SHOW_AFTER)
}

export function resetScrollToTop() {
  if (!button) return
  button.classList.remove('scroll-to-top--visible')
}

export function initScrollToTop() {
  if (button) return

  button = document.createElement('button')
  button.type = 'button'
  button.id = 'scroll-to-top'
  button.className = 'scroll-to-top'
  button.setAttribute('aria-label', t('app.scrollToTop'))
  button.title = t('app.scrollToTop')
  button.innerHTML = '<span class="scroll-to-top__icon" aria-hidden="true">↑</span>'

  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
    import('./router.js').then(({ render }) => render()).catch(() => {})
  })

  const app = document.getElementById('app')
  ;(app ?? document.body).appendChild(button)

  if (!bound) {
    bound = true
    window.addEventListener('scroll', updateVisibility, { passive: true })
  }
}