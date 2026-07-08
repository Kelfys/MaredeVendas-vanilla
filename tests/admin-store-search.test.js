// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { buildStoreSearchKey, normalizeForSearch } from '../js/utils.js'

function filterStoreNavItems(list, term) {
  const normalized = normalizeForSearch(term)
  let visibleCount = 0
  list.querySelectorAll('[data-store-nav]').forEach((item) => {
    const haystack = item.dataset.storeSearch ?? ''
    const visible = !normalized || haystack.includes(normalized)
    item.classList.toggle('hidden', !visible)
    if (visible) visibleCount += 1
  })
  return visibleCount
}

describe('admin products store search', () => {
  it('buildStoreSearchKey includes neighborhood and ignores accents', () => {
    const key = buildStoreSearchKey({
      name: 'Padária Pão Quente',
      neighborhood: { name: 'Nova Holanda' },
      city: 'Rio de Janeiro',
      state: 'RJ',
      owner: { name: 'José Silva', email: 'jose@loja.com' },
    })
    expect(key).toContain('padaria pao quente')
    expect(key).toContain('nova holanda')
    expect(key).toContain('jose@loja.com')
  })

  it('filters store nav items by name or neighborhood', () => {
    document.body.innerHTML = `
      <div id="admin-store-products-list">
        <a data-store-nav="1" data-store-search="mercearia do ze nova holanda rio rj"></a>
        <a data-store-nav="2" data-store-search="pet love ramos rio rj"></a>
      </div>
    `
    const list = document.getElementById('admin-store-products-list')

    expect(filterStoreNavItems(list, 'Ramos')).toBe(1)
    expect(list.querySelector('[data-store-nav="2"]').classList.contains('hidden')).toBe(false)
    expect(list.querySelector('[data-store-nav="1"]').classList.contains('hidden')).toBe(true)

    expect(filterStoreNavItems(list, '')).toBe(2)
    expect(list.querySelector('[data-store-nav="1"]').classList.contains('hidden')).toBe(false)
  })
})