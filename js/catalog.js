/**
 * Tipos de item do catálogo (produto físico ou serviço).
 */
import { t } from './strings.js'

export const CATALOG_ITEM_TYPES = [
  { id: 'product', get label() { return t('catalog.product') }, icon: '📦' },
  { id: 'service', get label() { return t('catalog.service') }, icon: '🛠️' },
]

export function normalizeItemType(itemType) {
  return itemType === 'service' ? 'service' : 'product'
}

export function isService(item) {
  return normalizeItemType(item?.item_type) === 'service'
}

export function getCatalogItemType(item) {
  return CATALOG_ITEM_TYPES.find((type) => type.id === normalizeItemType(item?.item_type)) ?? CATALOG_ITEM_TYPES[0]
}

export function getCatalogItemLabel(item) {
  return getCatalogItemType(item).label
}

export function getCatalogItemIcon(item) {
  return getCatalogItemType(item).icon
}

/** Serviços não dependem de estoque; produtos exigem stock > 0. */
export function isCatalogItemAvailable(item) {
  if (!item || item.active === false) return false
  if (isService(item)) return true
  return (item.stock ?? 0) > 0
}

export function catalogItemStockLabel(item) {
  if (isService(item)) return t('catalog.onRequest')
  return String(item.stock ?? 0)
}

export function catalogItemTypeOptionsHtml(selected = 'product') {
  return CATALOG_ITEM_TYPES.map((type) => `
    <option value="${type.id}" ${type.id === normalizeItemType(selected) ? 'selected' : ''}>${type.label}</option>
  `).join('')
}

export function catalogItemTypeFieldHtml(selected = 'product') {
  return `
    <div class="form-group">
      <label class="form-label">${t('catalog.type')}</label>
      <select class="form-input" name="item_type">${catalogItemTypeOptionsHtml(selected)}</select>
    </div>`
}

export function isUsedProduct(item) {
  return Boolean(item?.is_used)
}

export function catalogUsedFieldHtml(checked = false) {
  return `
    <div class="form-group" data-used-field>
      <label class="admin-check">
        <input type="checkbox" name="is_used" ${checked ? 'checked' : ''} />
        ${t('catalog.used')}
      </label>
    </div>`
}

export function readCatalogUsedFromForm(form) {
  const checkbox = form.is_used ?? form.querySelector?.('[name="is_used"]')
  if (!checkbox) return false
  if (normalizeItemType(form.item_type?.value) === 'service') return false
  return Boolean(checkbox.checked)
}

export function catalogStockFieldHtml(value = 0, itemType = 'product') {
  const isSvc = normalizeItemType(itemType) === 'service'
  return `
    <div class="form-group" data-stock-field ${isSvc ? 'hidden' : ''}>
      <label class="form-label">${t('catalog.stock')}</label>
      <input class="form-input" name="stock" type="number" min="0" value="${isSvc ? '' : value}" ${isSvc ? '' : 'required'} />
    </div>`
}

export function bindCatalogItemTypeForm(form) {
  if (!form) return
  const typeSelect = form.querySelector('[name="item_type"]')
  const stockGroup = form.querySelector('[data-stock-field]')
  const stockInput = form.querySelector('[name="stock"]')
  const usedGroup = form.querySelector('[data-used-field]')
  const usedInput = form.querySelector('[name="is_used"]')

  const toggle = () => {
    const isSvc = normalizeItemType(typeSelect?.value) === 'service'
    if (stockGroup) stockGroup.hidden = isSvc
    if (stockInput) {
      stockInput.required = !isSvc
      if (isSvc) stockInput.value = ''
    }
    if (usedGroup) usedGroup.hidden = isSvc
    if (usedInput && isSvc) usedInput.checked = false
  }

  typeSelect?.addEventListener('change', toggle)
  toggle()
}

export function readCatalogItemForm(form) {
  const itemType = normalizeItemType(form.item_type?.value)
  return {
    item_type: itemType,
    stock: itemType === 'service' ? null : parseInt(form.stock?.value ?? '0', 10),
  }
}