import { describe, it, expect } from 'vitest'
import {
  isService,
  isCatalogItemAvailable,
  isUsedProduct,
  normalizeItemType,
  readCatalogItemForm,
  readCatalogUsedFromForm,
} from '../js/catalog.js'

describe('catalog item types', () => {
  it('normalizes item type', () => {
    expect(normalizeItemType('service')).toBe('service')
    expect(normalizeItemType('product')).toBe('product')
    expect(normalizeItemType(undefined)).toBe('product')
  })

  it('detects services', () => {
    expect(isService({ item_type: 'service' })).toBe(true)
    expect(isService({ item_type: 'product' })).toBe(false)
  })

  it('treats services as always available when active', () => {
    expect(isCatalogItemAvailable({ item_type: 'service', active: true, stock: null })).toBe(true)
    expect(isCatalogItemAvailable({ item_type: 'service', active: false, stock: null })).toBe(false)
  })

  it('requires stock for products', () => {
    expect(isCatalogItemAvailable({ item_type: 'product', active: true, stock: 3 })).toBe(true)
    expect(isCatalogItemAvailable({ item_type: 'product', active: true, stock: 0 })).toBe(false)
  })

  it('reads catalog form fields', () => {
    const productForm = {
      item_type: { value: 'product' },
      stock: { value: '5' },
    }
    expect(readCatalogItemForm(productForm)).toEqual({ item_type: 'product', stock: 5 })

    const serviceForm = {
      item_type: { value: 'service' },
      stock: { value: '10' },
    }
    expect(readCatalogItemForm(serviceForm)).toEqual({ item_type: 'service', stock: null })
  })

  it('detects used products', () => {
    expect(isUsedProduct({ is_used: true })).toBe(true)
    expect(isUsedProduct({ is_used: false })).toBe(false)
    expect(isUsedProduct({})).toBe(false)
  })

  it('reads used flag from form and ignores services', () => {
    const usedForm = {
      item_type: { value: 'product' },
      is_used: { checked: true },
    }
    expect(readCatalogUsedFromForm(usedForm)).toBe(true)

    const serviceForm = {
      item_type: { value: 'service' },
      is_used: { checked: true },
    }
    expect(readCatalogUsedFromForm(serviceForm)).toBe(false)
  })
})