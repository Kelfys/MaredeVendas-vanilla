/**
 * Bairros (regiões) — seleção no feed e escopo do moderador.
 */
const NEIGHBORHOOD_STORAGE_KEY = 'maredevendas-neighborhood'

export function getSelectedNeighborhoodId() {
  return localStorage.getItem(NEIGHBORHOOD_STORAGE_KEY) || null
}

export function setSelectedNeighborhoodId(id) {
  if (id) localStorage.setItem(NEIGHBORHOOD_STORAGE_KEY, id)
  else localStorage.removeItem(NEIGHBORHOOD_STORAGE_KEY)
}

export function getModeratorNeighborhoodId(user) {
  return user?.role === 'moderator' ? user.neighborhood_id ?? null : null
}

export function formatNeighborhoodLabel(neighborhood) {
  if (!neighborhood) return ''
  const city = neighborhood.city?.trim()
  return city ? `${neighborhood.name} · ${city}` : neighborhood.name
}

/**
 * Ao escolher um bairro do admin, preenche cidade/UF (somente leitura).
 * Opções do select devem ter data-city e data-state.
 */
export function bindNeighborhoodLocationFields(root, {
  neighborhoodName = 'neighborhood_id',
  cityName = 'city',
  stateName = 'state',
  lockLocation = true,
} = {}) {
  const form = root?.matches?.('form') ? root : root?.querySelector?.('form') ?? root
  if (!form) return
  const select = form.querySelector?.(`[name="${neighborhoodName}"]`) ?? form.querySelector?.(`select[name="${neighborhoodName}"]`)
  const city = form.querySelector?.(`[name="${cityName}"]`)
  const state = form.querySelector?.(`[name="${stateName}"]`)
  if (!select || !city || !state) return

  const apply = () => {
    const value = select.value
    if (!value) return
    const opt = [...select.options].find((o) => o.value === value) ?? select.selectedOptions?.[0]
    if (!opt?.value) return
    const nextCity = opt.getAttribute('data-city') ?? opt.dataset?.city
    const nextState = opt.getAttribute('data-state') ?? opt.dataset?.state
    if (nextCity != null) city.value = nextCity
    if (nextState != null) state.value = nextState
  }

  if (lockLocation) {
    city.readOnly = true
    state.readOnly = true
    city.setAttribute('aria-readonly', 'true')
    state.setAttribute('aria-readonly', 'true')
  }

  select.addEventListener('change', apply)
  apply()
}

/** Escopo de dados para painéis staff: admin vê tudo; moderador só sua região. */
export function getStaffNeighborhoodScope(user, panel, adminFilterId = null) {
  if (panel === 'moderator') {
    return getModeratorNeighborhoodId(user) ?? undefined
  }
  return adminFilterId || undefined
}