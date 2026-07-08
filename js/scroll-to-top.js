/**
 * Botão flutuante para voltar ao topo da página.
 */
import { t } from './strings.js'

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
  })

  const app = document.getElementById('app')
  ;(app ?? document.body).appendChild(button)

  if (!bound) {
    bound = true
    window.addEventListener('scroll', updateVisibility, { passive: true })
  }
}