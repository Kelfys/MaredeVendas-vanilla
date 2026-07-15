/**
 * Integração com WhatsApp para finalização de pedidos.
 *
 * O fluxo não processa pagamento in-app — apenas monta a mensagem
 * e abre wa.me com o texto pré-preenchido.
 *
 * Telefones BR:
 * - Aceita `21912345678` (DDD+número) ou `5521912345678` (com DDI 55)
 * - Normaliza para dígitos com DDI 55 (wa.me exige E.164 sem +)
 * - Não confunde DDD 55 (RS) com DDI: só trata como DDI se length 12–13
 */
import { formatCurrency } from './utils.js'
import { getPaymentMethodLabel } from './payment.js'
import { isService } from './catalog.js'
import { t } from './strings.js'

/**
 * Extrai só dígitos e remove zeros à esquerda (ex.: 0219… → 219…).
 * @param {string|null|undefined} phone
 * @returns {string}
 */
export function digitsOnlyPhone(phone) {
  return String(phone ?? '').replace(/\D/g, '').replace(/^0+/, '')
}

/**
 * Normaliza para formato wa.me (DDI 55 + DDD + número).
 * - `21912345678` → `5521912345678`
 * - `5521912345678` → igual
 * - `(21) 91234-5678` → `5521912345678`
 * - DDD 55 (ex. `55987654321`) → `5555987654321` (não confunde com DDI)
 *
 * @param {string|null|undefined} phone
 * @returns {string} só dígitos com 55, ou '' se vazio
 */
export function normalizeBrazilWhatsapp(phone) {
  let d = digitsOnlyPhone(phone)
  if (!d) return ''

  // Já com DDI 55: 55 + DDD(2) + 8 ou 9 dígitos → 12 ou 13
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) {
    return d
  }

  // Nacional: DDD(2) + 8 (fixo) ou 9 (celular) → 10 ou 11
  if (d.length === 10 || d.length === 11) {
    return `55${d}`
  }

  // 12–13 dígitos sem 55 no início, ou outros tamanhos — devolve como está
  // (validação em assertValidBrazilWhatsapp rejeita)
  return d
}

/**
 * @param {string|null|undefined} phone
 * @returns {{ ok: true, digits: string } | { ok: false, reason: string }}
 */
export function parseBrazilWhatsapp(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw) return { ok: false, reason: 'empty' }

  const digits = normalizeBrazilWhatsapp(raw)
  // BR: 55 + 2 DDD + 8 ou 9 = 12 ou 13
  if (!/^55\d{10,11}$/.test(digits)) {
    return { ok: false, reason: 'length' }
  }
  const ddd = Number(digits.slice(2, 4))
  if (ddd < 11 || ddd > 99) {
    return { ok: false, reason: 'ddd' }
  }
  // Celular: 3º dígito nacional (após DDD) costuma ser 9
  const national = digits.slice(4)
  if (national.length === 9 && national[0] !== '9') {
    return { ok: false, reason: 'mobile' }
  }
  return { ok: true, digits }
}

/** Lança Error com mensagem i18n se inválido; retorna dígitos normalizados. */
export function assertValidBrazilWhatsapp(phone) {
  const parsed = parseBrazilWhatsapp(phone)
  if (parsed.ok) return parsed.digits
  if (parsed.reason === 'empty') throw new Error(t('errors.informPhone'))
  throw new Error(t('errors.invalidBrazilWhatsapp'))
}

export function buildOrderMessage({
  items,
  total,
  customerName,
  customerPhone,
  customerAddress,
  deliveryPeriod,
  paymentMethod,
}) {
  const lines = items.map((item) => {
    const kind = isService(item.product) ? t('catalog.service') : t('catalog.product')
    return t('whatsapp.lineItem', {
      kind,
      name: item.product.name,
      qty: item.quantity,
      price: formatCurrency(item.product.price * item.quantity),
    })
  })

  return [
    t('whatsapp.greeting'),
    '',
    t('whatsapp.orderIntro'),
    '',
    ...lines,
    '',
    t('whatsapp.total', { amount: formatCurrency(total) }),
    ...(paymentMethod ? ['', t('whatsapp.paymentMethod', { method: getPaymentMethodLabel(paymentMethod) })] : []),
    '',
    t('whatsapp.customerName', { name: customerName }),
    t('whatsapp.customerPhone', { phone: customerPhone }),
    '',
    t('whatsapp.addressLabel'),
    customerAddress,
    ...(deliveryPeriod ? ['', t('whatsapp.deliveryPeriod', { period: deliveryPeriod })] : []),
    '',
    t('whatsapp.thanks'),
  ].join('\n')
}

export function buildWhatsAppUrl(phone, message) {
  // Sempre normaliza DDI; se inválido, ainda tenta (evita quebrar checkout legado)
  const parsed = parseBrazilWhatsapp(phone)
  const normalized = parsed.ok
    ? parsed.digits
    : normalizeBrazilWhatsapp(phone) || digitsOnlyPhone(phone)
  return `https://wa.me/${normalized}?text=${encodeURIComponent(message)}`
}