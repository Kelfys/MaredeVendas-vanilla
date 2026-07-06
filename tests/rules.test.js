import { describe, it, expect } from 'vitest'
import { renderRulesAndPlansContent } from '../js/rules-plans-panel.js'

describe('renderRulesAndPlansContent', () => {
  it('includes rules and plan cards for login page', () => {
    const html = renderRulesAndPlansContent()

    expect(html).toContain('id="regras"')
    expect(html).toContain('id="planos"')
    expect(html).toContain('Conduta')
    expect(html).toContain('Enviar comprovante — Starter')
    expect(html).toContain('Como assinar um plano pago')
  })
})