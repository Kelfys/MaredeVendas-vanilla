/**
 * Navegação da área do cliente (minha conta).
 */
import { getCurrentPath, routeHref, getHashQueryParam } from './router.js'
import { t } from './strings.js'

export const CUSTOMER_MENU = [
  { id: 'overview', label: t('nav.customerOverview'), icon: '🏠' },
  { id: 'favorites', label: t('nav.customerFavorites'), icon: '❤️' },
  { id: 'liked', label: t('nav.customerLiked'), icon: '👍' },
  { id: 'orders', label: t('nav.customerOrders'), icon: '📦' },
  { id: 'profile', label: t('nav.customerProfile'), icon: '👤' },
]

const CUSTOMER_TAB_IDS = new Set(CUSTOMER_MENU.map((item) => item.id))

export function isCustomerAccountPath(path = getCurrentPath()) {
  return path === '/favoritos' || path.startsWith('/favoritos/')
}

export function getCustomerTab(path = getCurrentPath()) {
  if (!isCustomerAccountPath(path)) return 'overview'
  const tab = getHashQueryParam('tab')
  return CUSTOMER_TAB_IDS.has(tab) ? tab : 'overview'
}

export function customerMenuHref(item) {
  if (item.id === 'overview') return routeHref('/favoritos')
  return routeHref(`/favoritos?tab=${item.id}`)
}