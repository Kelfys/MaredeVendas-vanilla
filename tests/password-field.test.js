import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

function createInput(type = 'password') {
  return {
    type,
    classList: { add: vi.fn() },
    parentNode: null,
    closest: vi.fn((sel) => (sel === '.password-field' ? null : null)),
  }
}

function createButton() {
  const listeners = new Map()
  return {
    type: 'button',
    className: '',
    innerHTML: '',
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    addEventListener: vi.fn((event, fn) => listeners.set(event, fn)),
    click() {
      listeners.get('click')?.()
    },
  }
}

describe('password field toggle', () => {
  let input
  let form
  let main
  let createdButtons

  beforeEach(() => {
    createdButtons = []
    input = createInput()
    form = {
      appendChild: vi.fn(),
      insertBefore: vi.fn(),
      querySelectorAll: vi.fn((sel) => {
        if (sel === 'input[type="password"].form-input') return [input]
        return []
      }),
    }
    input.parentNode = form
    main = form

    vi.stubGlobal('document', {
      createElement: vi.fn((tag) => {
        if (tag === 'div') {
          return { className: '', appendChild: vi.fn(), parentNode: null }
        }
        if (tag === 'button') {
          const btn = createButton()
          createdButtons.push(btn)
          return btn
        }
        return {}
      }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('wraps password input and toggles visibility', async () => {
    const { bindPasswordToggles } = await import('../js/password-field.js')
    bindPasswordToggles(main)

    expect(document.createElement).toHaveBeenCalledWith('div')
    expect(document.createElement).toHaveBeenCalledWith('button')
    expect(input.classList.add).toHaveBeenCalledWith('password-field__input')

    const toggle = createdButtons[0]
    expect(toggle.setAttribute).toHaveBeenCalledWith('aria-label', 'Mostrar senha')

    toggle.click()
    expect(input.type).toBe('text')

    toggle.click()
    expect(input.type).toBe('password')
  })

  it('does not wrap the same input twice', async () => {
    input.closest = vi.fn((sel) => (sel === '.password-field' ? { id: 'wrapper' } : null))

    const { bindPasswordToggles } = await import('../js/password-field.js')
    bindPasswordToggles(main)

    expect(document.createElement).not.toHaveBeenCalled()
  })
})