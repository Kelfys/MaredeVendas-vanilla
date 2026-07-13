// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.stubGlobal('localStorage', {
  store: {},
  getItem(key) { return this.store[key] ?? null },
  setItem(key, value) { this.store[key] = value },
  removeItem(key) { delete this.store[key] },
})
import {
  getSelectedNeighborhoodId,
  setSelectedNeighborhoodId,
  getModeratorNeighborhoodId,
  getStaffNeighborhoodScope,
  formatNeighborhoodLabel,
  bindNeighborhoodLocationFields,
} from '../js/neighborhood.js'
const NEIGHBORHOOD_STORAGE_KEY = 'maredevendas-neighborhood'

describe('neighborhood helpers', () => {
  beforeEach(() => {
    localStorage.removeItem(NEIGHBORHOOD_STORAGE_KEY)
  })

  it('persists selected neighborhood in localStorage', () => {
    setSelectedNeighborhoodId('abc-123')
    expect(getSelectedNeighborhoodId()).toBe('abc-123')
    setSelectedNeighborhoodId(null)
    expect(getSelectedNeighborhoodId()).toBeNull()
  })

  it('formats neighborhood label with city', () => {
    expect(formatNeighborhoodLabel({ name: 'Copacabana', city: 'Rio de Janeiro' }))
      .toBe('Copacabana · Rio de Janeiro')
  })

  it('scopes moderator to assigned neighborhood', () => {
    const mod = { role: 'moderator', neighborhood_id: 'n1' }
    expect(getModeratorNeighborhoodId(mod)).toBe('n1')
    expect(getStaffNeighborhoodScope(mod, 'moderator')).toBe('n1')
    expect(getStaffNeighborhoodScope(mod, 'admin')).toBeUndefined()
  })

  it('fills city/state from neighborhood select and locks fields', () => {
    document.body.innerHTML = `
      <form id="f">
        <select name="neighborhood_id">
          <option value="">—</option>
          <option value="n1" data-city="Rio de Janeiro" data-state="RJ">Copacabana</option>
          <option value="n2" data-city="Niterói" data-state="RJ">Icaraí</option>
        </select>
        <input name="city" />
        <input name="state" />
      </form>
    `
    const form = document.querySelector('#f')
    bindNeighborhoodLocationFields(form)
    const select = form.querySelector('[name="neighborhood_id"]')
    const city = form.querySelector('[name="city"]')
    const state = form.querySelector('[name="state"]')

    expect(city.readOnly).toBe(true)
    expect(state.readOnly).toBe(true)

    select.value = 'n1'
    select.dispatchEvent(new Event('change'))
    expect(city.value).toBe('Rio de Janeiro')
    expect(state.value).toBe('RJ')

    select.value = 'n2'
    select.dispatchEvent(new Event('change'))
    expect(city.value).toBe('Niterói')
  })
})