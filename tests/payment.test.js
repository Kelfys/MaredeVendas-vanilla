import { describe, it, expect } from 'vitest'
import { PAYMENT_METHODS, getPaymentMethodLabel, isValidPaymentMethod } from '../js/payment.js'
import { buildOrderMessage } from '../js/whatsapp.js'

describe('payment methods', () => {
  it('lists checkout options', () => {
    expect(PAYMENT_METHODS.length).toBeGreaterThanOrEqual(3)
    expect(PAYMENT_METHODS.some((m) => m.id === 'pix')).toBe(true)
  })

  it('validates payment ids', () => {
    expect(isValidPaymentMethod('pix')).toBe(true)
    expect(isValidPaymentMethod('invalid')).toBe(false)
  })

  it('includes payment in whatsapp message', () => {
    const message = buildOrderMessage({
      items: [{ product: { name: 'Pão', price: 5 }, quantity: 2 }],
      total: 10,
      customerName: 'Ana',
      customerPhone: '21999999999',
      customerAddress: 'Rua A, 10',
      paymentMethod: 'pix',
    })
    expect(message).toContain('Forma de pagamento: PIX')
  })
})