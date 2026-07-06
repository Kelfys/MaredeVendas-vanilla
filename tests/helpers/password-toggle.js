import { expect } from 'vitest'

export function expectPasswordToggleWorks(main, { route, expectedCount = 1 } = {}) {
  const toggles = main.querySelectorAll('.password-field__toggle')
  const inputs = main.querySelectorAll('input[type="password"], input.password-field__input')

  expect(toggles.length, `${route}: deve ter botão de mostrar senha`).toBe(expectedCount)
  expect(inputs.length, `${route}: deve ter campo de senha`).toBe(expectedCount)

  toggles.forEach((toggle, index) => {
    const field = toggle.closest('.password-field')
    const input = field?.querySelector('input')
    expect(input, `${route}: toggle ${index + 1} sem input`).toBeTruthy()
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar senha')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(input.type).toBe('password')

    toggle.click()
    expect(input.type, `${route}: toggle ${index + 1} deve mostrar senha`).toBe('text')
    expect(toggle.getAttribute('aria-pressed')).toBe('true')
    expect(toggle.getAttribute('aria-label')).toBe('Ocultar senha')

    toggle.click()
    expect(input.type, `${route}: toggle ${index + 1} deve ocultar senha`).toBe('password')
    expect(toggle.getAttribute('aria-pressed')).toBe('false')
    expect(toggle.getAttribute('aria-label')).toBe('Mostrar senha')
  })
}