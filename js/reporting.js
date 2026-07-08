/**
 * Denúncias de lojas e produtos — modal e motivos.
 */
import { submitStoreReport, submitProductReport } from './api.js'
import { navigate } from './router.js'
import {
  canReportStore, canReportProduct, canSubmitContentReport, getReportLoginPath,
} from './report-permissions.js'
import { escapeHtml, showToast } from './utils.js'

export {
  canReportStore, canReportProduct, canSubmitContentReport, getReportLoginPath,
} from './report-permissions.js'
import { t } from './strings.js'

export const REPORT_REASONS = [
  { id: 'inappropriate', label: () => t('report.reasonInappropriate') },
  { id: 'misleading', label: () => t('report.reasonMisleading') },
  { id: 'spam', label: () => t('report.reasonSpam') },
  { id: 'offensive', label: () => t('report.reasonOffensive') },
  { id: 'other', label: () => t('report.reasonOther') },
]

const MODAL_ID = 'report-modal'

function reasonOptionsHtml() {
  return REPORT_REASONS.map((reason) => (
    `<option value="${reason.id}">${escapeHtml(reason.label())}</option>`
  )).join('')
}

function ensureReportModal() {
  if (document.getElementById(MODAL_ID)) return

  document.body.insertAdjacentHTML('beforeend', `
    <div class="report-modal" id="${MODAL_ID}" hidden>
      <div class="report-modal__backdrop" data-report-close></div>
      <div class="report-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="report-modal-title">
        <div class="report-modal__head">
          <h2 id="report-modal-title">${t('report.title')}</h2>
          <button type="button" class="report-modal__close" data-report-close aria-label="${t('labels.close')}">✕</button>
        </div>
        <p class="report-modal__target" data-report-target></p>
        <form class="report-modal__form" id="report-modal-form">
          <div class="form-group">
            <label class="form-label" for="report-reason">${t('report.reasonLabel')}</label>
            <select class="form-input" id="report-reason" name="reason" required>
              <option value="">${t('report.reasonPlaceholder')}</option>
              ${reasonOptionsHtml()}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label" for="report-details">${t('report.detailsLabel')}</label>
            <textarea class="form-input" id="report-details" name="details" rows="3" maxlength="500" placeholder="${t('report.detailsPlaceholder')}"></textarea>
          </div>
          <div class="report-modal__actions">
            <button type="button" class="btn btn-outline" data-report-close>${t('labels.cancel')}</button>
            <button type="submit" class="btn btn-primary">${t('report.submit')}</button>
          </div>
        </form>
      </div>
    </div>
  `)

  const modal = document.getElementById(MODAL_ID)
  const form = document.getElementById('report-modal-form')

  modal.querySelectorAll('[data-report-close]').forEach((el) => {
    el.addEventListener('click', () => closeReportModal())
  })

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeReportModal()
  })

  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    const payload = form._reportPayload
    if (!payload) return

    const submitBtn = form.querySelector('button[type="submit"]')
    if (submitBtn) {
      submitBtn.disabled = true
      submitBtn.textContent = t('checkout.submitting')
    }

    try {
      const reason = form.reason.value
      const details = form.details.value
      if (payload.type === 'store') {
        await submitStoreReport(payload.userId, payload.storeId, reason, details)
      } else {
        await submitProductReport(payload.userId, payload.productId, reason, details)
      }
      closeReportModal()
      showToast(t('report.submitted'))
      payload.onSuccess?.()
    } catch (err) {
      showToast(err.message ?? t('report.submitError'))
    } finally {
      if (submitBtn) {
        submitBtn.disabled = false
        submitBtn.textContent = t('report.submit')
      }
    }
  })
}

export function closeReportModal() {
  const modal = document.getElementById(MODAL_ID)
  if (!modal) return
  modal.hidden = true
  document.body.classList.remove('report-modal-open')
  const form = document.getElementById('report-modal-form')
  if (form) {
    form.reset()
    form._reportPayload = null
  }
}

export function openReportModal({
  type,
  userId,
  storeId = null,
  productId = null,
  targetLabel = '',
  onSuccess = null,
} = {}) {
  ensureReportModal()
  const modal = document.getElementById(MODAL_ID)
  const form = document.getElementById('report-modal-form')
  const targetEl = modal.querySelector('[data-report-target]')

  form._reportPayload = { type, userId, storeId, productId, onSuccess }
  if (targetEl) {
    targetEl.textContent = type === 'store'
      ? t('report.targetStore', { name: targetLabel })
      : t('report.targetProduct', { name: targetLabel })
  }

  modal.hidden = false
  document.body.classList.add('report-modal-open')
  form.reason.focus()
}

export function bindReportTriggers(root, { user, storeOwnerId = null, onRequireAuth, redirectPath = '/' } = {}) {
  if (!root) return

  const requireAuth = onRequireAuth ?? (() => {
    navigate(getReportLoginPath(user, redirectPath))
    showToast(t('report.loginRequired'))
  })

  root.querySelectorAll('[data-report-store]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canSubmitContentReport(user)) {
        requireAuth()
        return
      }
      openReportModal({
        type: 'store',
        userId: user.id,
        storeId: btn.dataset.reportStore,
        targetLabel: btn.dataset.reportStoreName ?? '',
      })
    })
  })

  root.querySelectorAll('[data-report-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!canSubmitContentReport(user)) {
        requireAuth()
        return
      }
      openReportModal({
        type: 'product',
        userId: user.id,
        productId: btn.dataset.reportProduct,
        targetLabel: btn.dataset.reportProductName ?? '',
      })
    })
  })
}

export function renderReportButton({ type, id, name, user, storeOwnerId = null, store = null, product = null }) {
  if (type === 'store' && !canReportStore(user, store ?? { id, owner_id: storeOwnerId })) return ''
  if (type === 'product' && !canReportProduct(user, product ?? { id }, storeOwnerId)) return ''

  const attrs = type === 'store'
    ? `data-report-store="${id}" data-report-store-name="${escapeHtml(name)}"`
    : `data-report-product="${id}" data-report-product-name="${escapeHtml(name)}"`

  return `
    <button type="button" class="report-btn" ${attrs} title="${t('report.button')}">
      🚩 ${t('report.button')}
    </button>
  `
}