/**
 * Botão de mostrar/ocultar senha (ícone) para inputs type="password".
 */
import { t } from './strings.js'

const ICON_SHOW = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`

const ICON_HIDE = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`

function wrapPasswordInput(input) {
  if (input.closest('.password-field')) return

  const wrapper = document.createElement('div')
  wrapper.className = 'password-field'
  input.classList.add('password-field__input')
  input.parentNode.insertBefore(wrapper, input)
  wrapper.appendChild(input)

  const toggle = document.createElement('button')
  toggle.type = 'button'
  toggle.className = 'password-field__toggle icon-btn'
  toggle.setAttribute('aria-label', t('common.showPassword'))
  toggle.setAttribute('aria-pressed', 'false')
  toggle.innerHTML = ICON_SHOW

  toggle.addEventListener('click', () => {
    const visible = input.type === 'text'
    input.type = visible ? 'password' : 'text'
    toggle.setAttribute('aria-pressed', String(!visible))
    toggle.setAttribute('aria-label', visible ? t('common.showPassword') : t('common.hidePassword'))
    toggle.innerHTML = visible ? ICON_SHOW : ICON_HIDE
  })

  wrapper.appendChild(toggle)
}

/** Envolve inputs de senha no container e adiciona o botão de visibilidade. */
export function bindPasswordToggles(root) {
  if (!root?.querySelectorAll) return
  root.querySelectorAll('input[type="password"].form-input').forEach(wrapPasswordInput)
}