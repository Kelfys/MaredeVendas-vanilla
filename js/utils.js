export function formatCurrency(value) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

export function formatPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return phone
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  }).format(new Date(date))
}

export function generateSlug(text) {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function sanitizeSearch(query) {
  return query.trim().replace(/[%_\\]/g, '')
}

export function showToast(message, duration = 3000) {
  const el = document.getElementById('toast')
  if (!el) return
  el.textContent = message
  el.classList.remove('hidden')
  clearTimeout(showToast._timer)
  showToast._timer = setTimeout(() => el.classList.add('hidden'), duration)
}