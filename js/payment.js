/**
 * Formas de pagamento no checkout do carrinho.
 * Não há cobrança in-app — a escolha vai no pedido e na mensagem do WhatsApp.
 */
export const PAYMENT_METHODS = [
  { id: 'pix', label: 'PIX', hint: 'A loja envia a chave no WhatsApp' },
  { id: 'cash', label: 'Dinheiro na entrega', hint: 'Pague ao receber o pedido' },
  { id: 'card', label: 'Cartão na entrega', hint: 'Maquininha ou cartão com a loja' },
  { id: 'transfer', label: 'Transferência', hint: 'Dados bancários combinados no WhatsApp' },
]

export const DEFAULT_PAYMENT_METHOD = 'pix'

const PAYMENT_LABELS = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.id, m.label]))

export function getPaymentMethodLabel(methodId) {
  return PAYMENT_LABELS[methodId] ?? methodId
}

export function isValidPaymentMethod(methodId) {
  return PAYMENT_METHODS.some((m) => m.id === methodId)
}