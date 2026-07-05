import { formatCurrency } from './utils.js'

export function buildOrderMessage({ items, total, customerName, customerPhone, customerAddress, deliveryPeriod }) {
  const lines = items.map(
    (item) => `${item.product.name} (${item.quantity}x) - ${formatCurrency(item.product.price * item.quantity)}`
  )

  return [
    'Olá!',
    '',
    'Gostaria de fazer o seguinte pedido:',
    '',
    ...lines,
    '',
    `Total: ${formatCurrency(total)}`,
    '',
    `Nome: ${customerName}`,
    `Telefone: ${customerPhone}`,
    '',
    'Endereço:',
    customerAddress,
    ...(deliveryPeriod ? ['', `Melhor horário para entrega: ${deliveryPeriod}`] : []),
    '',
    'Obrigado.',
  ].join('\n')
}

export function buildWhatsAppUrl(phone, message) {
  const digits = phone.replace(/\D/g, '')
  const normalized = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}