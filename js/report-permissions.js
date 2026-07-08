import { ROLES } from './roles.js'

const REPORTER_ROLES = new Set([ROLES.CUSTOMER, ROLES.MERCHANT])

/** Clientes e lojistas autenticados podem enviar denúncias no marketplace. */
export function canSubmitContentReport(user) {
  return Boolean(user?.id && REPORTER_ROLES.has(user.role))
}

export function canReportStore(user, store) {
  if (!canSubmitContentReport(user) || !store?.id) return false
  if (store.owner_id == null) return true
  return store.owner_id !== user.id
}

export function canReportProduct(user, product, storeOwnerId = null) {
  if (!canSubmitContentReport(user) || !product?.id) return false
  const ownerId = storeOwnerId ?? product?.store?.owner_id
  if (ownerId == null) return true
  return ownerId !== user.id
}

export function getReportLoginPath(user, redirectPath = '/') {
  const redirect = encodeURIComponent(redirectPath)
  if (user?.role === ROLES.MERCHANT) {
    return `/lojista/entrar?redirect=${redirect}`
  }
  return `/conta/entrar?redirect=${redirect}`
}