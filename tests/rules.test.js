import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

describe('rules page', () => {
  beforeEach(() => {
    vi.stubGlobal('document', {
      createElement: () => ({ innerHTML: '' }),
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders rules without plan cards', async () => {
    const main = { innerHTML: '' }
    const { renderRules } = await import('../js/pages/rules.js')
    await renderRules(main)

    expect(main.innerHTML).toContain('Regras da Plataforma')
    expect(main.innerHTML).toContain('Conduta')
    expect(main.innerHTML).not.toContain('plan-grid')
    expect(main.innerHTML).not.toContain('Enviar comprovante — Starter')
    expect(main.innerHTML).toContain('Entrar como lojista')
  })
})