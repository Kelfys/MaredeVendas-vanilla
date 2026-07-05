/**
 * Painel administrativo — conteúdo dinâmico; navegação no ícone ⚙️ do header.
 */
import {
  fetchAdminMetrics, fetchPendingStoreApprovals,
  approveStoreRegistration, rejectStoreRegistration,
  updatePassword, fetchMerchants, fetchAllStoresAdmin,
  fetchAdminProducts, createStoreAsAdmin, createProduct, updateProduct,
  updateStoreAsAdmin, deleteProduct, fetchCategories,
} from '../api.js'
import { getUser } from '../state.js'
import { navigate } from '../router.js'
import { escapeHtml, formatDate, formatCurrency, showToast } from '../utils.js'
import { STORE_THEME_COLORS } from '../config.js'
import { getAdminMenuItem } from '../admin-nav.js'
import { planAllowsStoreBranding, FREE_PLAN_BRANDING_MESSAGE } from '../plans.js'
import {
  PRODUCT_IMAGE_UPLOAD_HINT, STORE_BRANDING_UPLOAD_HINT,
  validateImageFile, STORAGE_BUCKETS,
} from '../uploads.js'

function guardAdmin(main) {
  const user = getUser()
  if (!user || user.role !== 'admin') {
    main.innerHTML = `<div class="empty-state"><h2>Acesso restrito</h2><p><a href="#/admin/entrar">Entrar como admin</a></p></div>`
    return null
  }
  return user
}

function adminPage(title, subtitle, content) {
  return `
    <div class="admin-page">
      <div class="admin-page__head">
        <div>
          <h1 class="admin-page__title">${escapeHtml(title)}</h1>
          ${subtitle ? `<p class="admin-page__subtitle">${escapeHtml(subtitle)}</p>` : ''}
        </div>
      </div>
      <div class="admin-page__body admin-fade-in">${content}</div>
    </div>
  `
}

function statusBadge(status) {
  const map = {
    pending: '<span class="badge badge-pending">Pendente</span>',
    approved: '<span class="badge badge-approved">Aprovada</span>',
    blocked: '<span class="badge badge-blocked">Bloqueada</span>',
  }
  return map[status] ?? escapeHtml(status)
}

function imagePreviewBlock(url, alt, variant = 'square') {
  if (!url) {
    return `<div class="admin-image-preview admin-image-preview--empty admin-image-preview--${variant}">Sem imagem</div>`
  }
  return `<img class="admin-image-preview admin-image-preview--${variant}" src="${escapeHtml(url)}" alt="${escapeHtml(alt)}" />`
}

function bindImagePreview(input, previewEl) {
  if (!input || !previewEl) return
  input.addEventListener('change', () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      previewEl.innerHTML = `<img class="admin-image-preview" src="${reader.result}" alt="Prévia" />`
    }
    reader.readAsDataURL(file)
  })
}

function storeBrandingFieldsHtml(planId, store = null) {
  const id = store?.id ?? ''
  const allowed = planAllowsStoreBranding(planId)

  if (!allowed) {
    return `
      <div class="form-group admin-form-grid__full" data-branding-locked>
        <p class="form-hint form-hint--info">${escapeHtml(FREE_PLAN_BRANDING_MESSAGE)}</p>
      </div>`
  }

  return `
    <div class="form-group" data-branding-field>
      <label class="form-label">Logo</label>
      ${store
        ? `<div class="admin-image-field">
            <div data-preview-logo="${id}">${imagePreviewBlock(store.logo, store.name, 'square')}</div>
            <input class="form-input" type="file" name="logo" accept="image/*" />
          </div>
          ${store.logo ? `<label class="admin-check"><input type="checkbox" name="remove_logo" /> Remover logo atual</label>` : ''}`
        : `<input class="form-input" type="file" name="logo" accept="image/*" />
           <small class="form-hint">${STORE_BRANDING_UPLOAD_HINT}</small>`}
    </div>
    <div class="form-group admin-form-grid__full" data-branding-field>
      <label class="form-label">Banner</label>
      ${store
        ? `<div class="admin-image-field">
            <div data-preview-banner="${id}">${imagePreviewBlock(store.banner, store.name, 'banner')}</div>
            <input class="form-input" type="file" name="banner" accept="image/*" />
          </div>
          ${store.banner ? `<label class="admin-check"><input type="checkbox" name="remove_banner" /> Remover banner atual</label>` : ''}`
        : `<input class="form-input" type="file" name="banner" accept="image/*" />
           <small class="form-hint">${STORE_BRANDING_UPLOAD_HINT}</small>`}
    </div>`
}

function adminProductsPath(storeId = null) {
  return storeId ? `/admin/produtos/${storeId}` : '/admin/produtos'
}

function productCountMap(products) {
  const counts = {}
  for (const product of products) {
    counts[product.store_id] = (counts[product.store_id] ?? 0) + 1
  }
  return counts
}

function renderProductTableRows(products, categories) {
  if (products.length === 0) {
    return '<tr><td colspan="5">Nenhum produto nesta loja</td></tr>'
  }

  return products.map((p) => `
    <tr>
      <td>
        <div class="admin-table-thumb">
          ${p.image ? `<img src="${escapeHtml(p.image)}" alt="" />` : '<span>📦</span>'}
        </div>
        ${escapeHtml(p.name)}
      </td>
      <td>${formatCurrency(p.price)}</td>
      <td>${p.stock}</td>
      <td>${p.active ? '✓' : '✗'}</td>
      <td style="white-space:nowrap">
        <button type="button" class="btn btn-outline btn-sm" data-edit-product="${p.id}">Editar</button>
        <button type="button" class="btn btn-outline btn-sm" data-del-product="${p.id}">Excluir</button>
      </td>
    </tr>
    <tr class="admin-edit-row" id="edit-product-row-${p.id}" hidden>
      <td colspan="5">
        <form class="admin-edit-panel admin-form-grid" data-product-edit="${p.id}">
          <div class="form-group">
            <label class="form-label">Nome</label>
            <input class="form-input" name="name" value="${escapeHtml(p.name)}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Preço (R$)</label>
            <input class="form-input" name="price" type="number" step="0.01" min="0" value="${p.price}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Estoque</label>
            <input class="form-input" name="stock" type="number" min="0" value="${p.stock}" required />
          </div>
          <div class="form-group">
            <label class="form-label">Categoria</label>
            <select class="form-input" name="category_id">
              <option value="">Sem categoria</option>
              ${categories.map((c) => `<option value="${c.id}" ${p.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">Ativo</label>
            <select class="form-input" name="active">
              <option value="true" ${p.active ? 'selected' : ''}>Sim</option>
              <option value="false" ${!p.active ? 'selected' : ''}>Não</option>
            </select>
          </div>
          <div class="form-group admin-form-grid__full">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" name="description" rows="2">${escapeHtml(p.description ?? '')}</textarea>
          </div>
          <div class="form-group admin-form-grid__full">
            <label class="form-label">Imagem</label>
            <div class="admin-image-field">
              <div data-preview-product="${p.id}">${imagePreviewBlock(p.image, p.name, 'square')}</div>
              <input class="form-input" type="file" name="image" accept="image/*" />
              <small class="form-hint">${PRODUCT_IMAGE_UPLOAD_HINT}</small>
            </div>
          </div>
          <div class="admin-form-grid__full admin-edit-panel__actions">
            <button type="submit" class="btn btn-primary btn-sm">Salvar produto</button>
            <button type="button" class="btn btn-outline btn-sm" data-cancel-product="${p.id}">Cancelar</button>
          </div>
        </form>
      </td>
    </tr>
  `).join('')
}

function renderStoreProductsSidebar(stores, counts, selectedStoreId) {
  const sorted = [...stores].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return `
    <aside class="admin-store-products-nav">
      <div class="admin-store-products-nav__head">
        <h2>Lojas</h2>
        <span class="admin-store-products-nav__count">${sorted.length}</span>
      </div>
      <input
        type="search"
        class="form-input admin-store-products-nav__search"
        id="admin-store-products-search"
        placeholder="Buscar loja..."
        autocomplete="off"
      />
      <div class="admin-store-products-nav__list" id="admin-store-products-list">
        ${sorted.length === 0
          ? '<p class="admin-store-products-nav__empty">Nenhuma loja cadastrada</p>'
          : sorted.map((s) => `
            <a
              href="#${adminProductsPath(s.id)}"
              class="admin-store-products-nav__item ${s.id === selectedStoreId ? 'active' : ''}"
              data-store-nav="${s.id}"
              data-store-name="${escapeHtml(s.name.toLowerCase())}"
            >
              <span class="admin-store-products-nav__item-name">${escapeHtml(s.name)}</span>
              <span class="admin-store-products-nav__item-meta">
                ${counts[s.id] ?? 0} produto${(counts[s.id] ?? 0) === 1 ? '' : 's'}
              </span>
            </a>
          `).join('')}
      </div>
    </aside>`
}

function renderStoreProductsPanel({ store, products, categories, canCreate }) {
  if (!store) {
    return `
      <div class="admin-store-products-main admin-store-products-main--empty">
        <div class="empty-state">
          <h2>Selecione uma loja</h2>
          <p>Escolha uma loja na lista ao lado para ver e editar os produtos.</p>
        </div>
      </div>`
  }

  return `
    <div class="admin-store-products-main">
      <div class="admin-store-products-main__head">
        <div>
          <h2>${escapeHtml(store.name)}</h2>
          <p class="admin-store-products-main__meta">
            ${escapeHtml(store.city)}, ${escapeHtml(store.state)}
            · ${statusBadge(store.status)}
            · ${products.length} produto${products.length === 1 ? '' : 's'}
          </p>
        </div>
        <div class="admin-store-products-main__actions">
          ${store.status === 'approved' ? `<a href="#/loja/${escapeHtml(store.slug)}" class="btn btn-outline btn-sm">Ver loja</a>` : ''}
        </div>
      </div>

      ${canCreate ? `
        <details class="admin-form-panel">
          <summary>+ Novo produto em ${escapeHtml(store.name)}</summary>
          <form id="admin-product-form" class="admin-form-grid">
            <input type="hidden" name="store_id" value="${escapeHtml(store.id)}" />
            <div class="form-group">
              <label class="form-label">Nome</label>
              <input class="form-input" name="name" required />
            </div>
            <div class="form-group">
              <label class="form-label">Preço (R$)</label>
              <input class="form-input" name="price" type="number" step="0.01" min="0" required />
            </div>
            <div class="form-group">
              <label class="form-label">Estoque</label>
              <input class="form-input" name="stock" type="number" min="0" value="10" required />
            </div>
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select class="form-input" name="category_id">
                <option value="">Sem categoria</option>
                ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group admin-form-grid__full">
              <label class="form-label">Descrição</label>
              <textarea class="form-input" name="description" rows="2"></textarea>
            </div>
            <div class="form-group admin-form-grid__full">
              <label class="form-label">Imagem do produto</label>
              <div class="admin-image-field">
                <div data-preview-product-create>${imagePreviewBlock(null, 'Novo produto', 'square')}</div>
                <input class="form-input" type="file" name="image" accept="image/*" />
                <small class="form-hint">${PRODUCT_IMAGE_UPLOAD_HINT}</small>
              </div>
            </div>
            <div class="admin-form-grid__full">
              <button type="submit" class="btn btn-primary">Criar produto</button>
            </div>
          </form>
        </details>` : `
        <div class="alert" style="margin-bottom:1rem">
          Esta loja ainda não está aprovada. Aprove-a em Aprovações para cadastrar novos produtos.
        </div>`}

      <div class="table-wrap admin-store-products-table">
        <table>
          <thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${renderProductTableRows(products, categories)}
          </tbody>
        </table>
      </div>
    </div>`
}

function bindPlanBrandingToggle(scope) {
  scope.querySelectorAll('[data-plan-branding-form]').forEach((form) => {
    const planSelect = form.querySelector('[name="plan_id"]')
    const brandingWrap = form.querySelector('[data-branding-wrap]')
    if (!planSelect || !brandingWrap) return

    const sync = () => {
      const allowed = planAllowsStoreBranding(planSelect.value)
      brandingWrap.querySelectorAll('[data-branding-field]').forEach((el) => {
        el.hidden = !allowed
        el.querySelectorAll('input[type="file"]').forEach((inp) => {
          inp.disabled = !allowed
          if (!allowed) inp.value = ''
        })
      })
      const locked = brandingWrap.querySelector('[data-branding-locked]')
      if (locked) locked.hidden = allowed
    }

    planSelect.addEventListener('change', sync)
    sync()
  })
}

function quickActions() {
  return `
    <div class="admin-quick-actions">
      <a href="#/admin/lojas" class="admin-quick-card">
        <span class="admin-quick-card__icon">🏪</span>
        <strong>Nova loja</strong>
        <span>Cadastrar vitrine</span>
      </a>
      <a href="#/admin/produtos" class="admin-quick-card">
        <span class="admin-quick-card__icon">📦</span>
        <strong>Novo produto</strong>
        <span>Adicionar ao catálogo</span>
      </a>
      <a href="#/admin/aprovacoes" class="admin-quick-card">
        <span class="admin-quick-card__icon">✅</span>
        <strong>Aprovações</strong>
        <span>Revisar cadastros</span>
      </a>
      <a href="#/" class="admin-quick-card admin-quick-card--muted">
        <span class="admin-quick-card__icon">🌐</span>
        <strong>Ver site</strong>
        <span>Abrir marketplace</span>
      </a>
    </div>
  `
}

function metricCards(metrics, pendingCount) {
  const items = [
    { label: 'Lojas', value: metrics.totalStores, href: '#/admin/lojas' },
    { label: 'Produtos', value: metrics.totalProducts, href: '#/admin/produtos' },
    { label: 'Pedidos', value: metrics.totalOrders, href: null },
    { label: 'Visualizações', value: metrics.totalViews, href: null },
    { label: 'Pendentes', value: pendingCount, href: '#/admin/aprovacoes', highlight: pendingCount > 0 },
  ]

  return `
    <div class="metrics admin-metrics">
      ${items.map((m) => `
        ${m.href
          ? `<a href="${m.href}" class="metric-card metric-card--link ${m.highlight ? 'metric-card--alert' : ''}">
              <div class="metric-card__value">${m.value}</div>
              <div class="metric-card__label">${m.label}</div>
            </a>`
          : `<div class="metric-card">
              <div class="metric-card__value">${m.value}</div>
              <div class="metric-card__label">${m.label}</div>
            </div>`}
      `).join('')}
    </div>
  `
}

export async function renderAdminDashboard(main, tab = 'overview', selectedStoreId = null) {
  const user = guardAdmin(main)
  if (!user) return

  const menuItem = getAdminMenuItem(tab)

  if (tab === 'overview') {
    const [metrics, pending] = await Promise.all([
      fetchAdminMetrics(),
      fetchPendingStoreApprovals(),
    ])

    const pendingPreview = pending.slice(0, 3)

    main.innerHTML = adminPage(
      menuItem.label,
      'Resumo da plataforma e atalhos rápidos',
      `
        ${quickActions()}
        ${metricCards(metrics, pending.length)}
        <section class="admin-section">
          <div class="admin-section__head">
            <h2>Aprovações recentes</h2>
            ${pending.length > 0 ? `<a href="#/admin/aprovacoes" class="btn btn-outline btn-sm">Ver todas (${pending.length})</a>` : ''}
          </div>
          ${pendingPreview.length === 0
            ? '<div class="empty-state"><p>Nenhuma loja aguardando aprovação.</p></div>'
            : `<div class="admin-cards-list">
                ${pendingPreview.map((s) => `
                  <article class="admin-list-card">
                    <div>
                      <strong>${escapeHtml(s.name)}</strong>
                      <p>${escapeHtml(s.city)}, ${escapeHtml(s.state)} · ${formatDate(s.created_at)}</p>
                    </div>
                    <div class="admin-list-card__actions">
                      <button type="button" class="btn btn-primary btn-sm" data-approve="${s.id}">Aprovar</button>
                      <button type="button" class="btn btn-outline btn-sm" data-reject="${s.id}">Rejeitar</button>
                    </div>
                  </article>
                `).join('')}
              </div>`}
        </section>
      `
    )

    bindApprovalActions(main, 'overview')
    return
  }

  if (tab === 'approvals') {
    const pending = await fetchPendingStoreApprovals()

    main.innerHTML = adminPage(
      menuItem.label,
      `${pending.length} loja(s) aguardando sua revisão`,
      pending.length === 0
        ? '<div class="empty-state"><p>Nenhuma loja aguardando aprovação.</p></div>'
        : `<div class="table-wrap"><table>
            <thead><tr><th>Loja</th><th>Lojista</th><th>Cidade</th><th>Data</th><th>Ações</th></tr></thead>
            <tbody>
              ${pending.map((s) => `
                <tr>
                  <td><strong>${escapeHtml(s.name)}</strong><br><small>${escapeHtml(s.whatsapp)}</small></td>
                  <td>${escapeHtml(s.owner?.name ?? '—')}<br><small>${escapeHtml(s.owner?.email ?? '')}</small></td>
                  <td>${escapeHtml(s.city)}, ${escapeHtml(s.state)}</td>
                  <td>${formatDate(s.created_at)}</td>
                  <td style="white-space:nowrap">
                    <button type="button" class="btn btn-primary btn-sm" data-approve="${s.id}">Aprovar</button>
                    <button type="button" class="btn btn-outline btn-sm" data-reject="${s.id}">Rejeitar</button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table></div>`
    )

    bindApprovalActions(main, 'approvals')
    return
  }

  if (tab === 'stores') {
    const [stores, merchants, categories] = await Promise.all([
      fetchAllStoresAdmin(),
      fetchMerchants(),
      fetchCategories(),
    ])

    main.innerHTML = adminPage(
      menuItem.label,
      `${stores.length} loja(s) cadastradas`,
      `
        <div id="admin-store-msg"></div>
        ${merchants.length === 0
          ? '<div class="empty-state" style="margin-bottom:1rem"><p>Nenhum lojista cadastrado. Crie contas em <a href="#/lojista/cadastro">Área do Lojista</a> primeiro.</p></div>'
          : ''}
        <details class="admin-form-panel" open ${merchants.length === 0 ? 'style="opacity:0.6;pointer-events:none"' : ''}>
          <summary>+ Nova loja</summary>
          <form id="admin-store-form" class="admin-form-grid" data-plan-branding-form>
            <div class="form-group">
              <label class="form-label">Lojista responsável</label>
              <select class="form-input" name="owner_id" required>
                <option value="">Selecione...</option>
                ${merchants.map((m) => `<option value="${m.id}">${escapeHtml(m.name)} (${escapeHtml(m.email)})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Nome da loja</label>
              <input class="form-input" name="name" required />
            </div>
            <div class="form-group">
              <label class="form-label">Categoria</label>
              <select class="form-input" name="category_id" required>
                ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">WhatsApp</label>
              <input class="form-input" name="whatsapp" required placeholder="5521999999999" />
            </div>
            <div class="form-group">
              <label class="form-label">Cidade</label>
              <input class="form-input" name="city" required />
            </div>
            <div class="form-group">
              <label class="form-label">UF</label>
              <input class="form-input" name="state" required maxlength="2" value="RJ" />
            </div>
            <div class="form-group admin-form-grid__full">
              <label class="form-label">Descrição</label>
              <textarea class="form-input" name="description" rows="2"></textarea>
            </div>
            <div class="form-group admin-form-grid__full">
              <label class="form-label">Endereço</label>
              <input class="form-input" name="address" />
            </div>
            <div class="form-group">
              <label class="form-label">Horário</label>
              <input class="form-input" name="opening_hours" placeholder="Seg–Sáb 8h–20h" />
            </div>
            <div class="form-group">
              <label class="form-label">Cor do tema</label>
              <select class="form-input" name="theme_color">
                ${STORE_THEME_COLORS.map((c) => `<option value="${c.id}">${c.id}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Plano</label>
              <select class="form-input" name="plan_id">
                <option value="free">Gratuito</option>
                <option value="starter">Starter</option>
                <option value="growth">Growth</option>
                <option value="premium">Premium</option>
              </select>
            </div>
            <div data-branding-wrap class="admin-form-grid__full admin-form-grid">
              ${storeBrandingFieldsHtml('free')}
            </div>
            <div class="form-group admin-form-grid__full">
              <label class="admin-check">
                <input type="checkbox" name="approved" checked />
                Publicar loja imediatamente (aprovada e ativa)
              </label>
            </div>
            <div class="admin-form-grid__full">
              <button type="submit" class="btn btn-primary">Criar loja</button>
            </div>
          </form>
        </details>
        <div class="table-wrap" style="margin-top:1.5rem">
          <table>
            <thead><tr><th>Loja</th><th>Lojista</th><th>Cidade</th><th>Status</th><th>Plano</th><th></th></tr></thead>
            <tbody>
              ${stores.length === 0 ? '<tr><td colspan="6">Nenhuma loja</td></tr>' : stores.map((s) => `
                <tr>
                  <td>
                    <div class="admin-table-thumb">
                      ${s.logo ? `<img src="${escapeHtml(s.logo)}" alt="" />` : '<span>🏪</span>'}
                    </div>
                    <strong>${escapeHtml(s.name)}</strong><br><small>/${escapeHtml(s.slug)}</small>
                  </td>
                  <td>${escapeHtml(s.owner?.name ?? '—')}<br><small>${escapeHtml(s.owner?.email ?? '')}</small></td>
                  <td>${escapeHtml(s.city)}, ${escapeHtml(s.state)}</td>
                  <td>${statusBadge(s.status)}</td>
                  <td>${escapeHtml(s.plan_id)}</td>
                  <td style="white-space:nowrap">
                    <a href="#${adminProductsPath(s.id)}" class="btn btn-outline btn-sm">Produtos</a>
                    <button type="button" class="btn btn-outline btn-sm" data-edit-store="${s.id}">Editar</button>
                    ${s.status === 'approved' ? `<a href="#/loja/${escapeHtml(s.slug)}" class="btn btn-outline btn-sm">Ver</a>` : ''}
                  </td>
                </tr>
                <tr class="admin-edit-row" id="edit-store-row-${s.id}" hidden>
                  <td colspan="6">
                    <form class="admin-edit-panel admin-form-grid" data-store-edit="${s.id}" data-plan-branding-form>
                      <div class="form-group">
                        <label class="form-label">Nome</label>
                        <input class="form-input" name="name" value="${escapeHtml(s.name)}" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">WhatsApp</label>
                        <input class="form-input" name="whatsapp" value="${escapeHtml(s.whatsapp)}" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Cidade</label>
                        <input class="form-input" name="city" value="${escapeHtml(s.city)}" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">UF</label>
                        <input class="form-input" name="state" value="${escapeHtml(s.state)}" maxlength="2" required />
                      </div>
                      <div class="form-group">
                        <label class="form-label">Categoria</label>
                        <select class="form-input" name="category_id">
                          ${categories.map((c) => `<option value="${c.id}" ${s.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Cor do tema</label>
                        <select class="form-input" name="theme_color">
                          ${STORE_THEME_COLORS.map((c) => `<option value="${c.id}" ${s.theme_color === c.id ? 'selected' : ''}>${c.id}</option>`).join('')}
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Status</label>
                        <select class="form-input" name="status">
                          <option value="pending" ${s.status === 'pending' ? 'selected' : ''}>Pendente</option>
                          <option value="approved" ${s.status === 'approved' ? 'selected' : ''}>Aprovada</option>
                          <option value="blocked" ${s.status === 'blocked' ? 'selected' : ''}>Bloqueada</option>
                        </select>
                      </div>
                      <div class="form-group">
                        <label class="form-label">Plano</label>
                        <select class="form-input" name="plan_id">
                          ${['free', 'starter', 'growth', 'premium'].map((p) => `<option value="${p}" ${s.plan_id === p ? 'selected' : ''}>${p}</option>`).join('')}
                        </select>
                      </div>
                      <div class="form-group admin-form-grid__full">
                        <label class="form-label">Descrição</label>
                        <textarea class="form-input" name="description" rows="2">${escapeHtml(s.description ?? '')}</textarea>
                      </div>
                      <div class="form-group admin-form-grid__full">
                        <label class="form-label">Endereço</label>
                        <input class="form-input" name="address" value="${escapeHtml(s.address ?? '')}" />
                      </div>
                      <div class="form-group admin-form-grid__full">
                        <label class="form-label">Horário</label>
                        <input class="form-input" name="opening_hours" value="${escapeHtml(s.opening_hours ?? '')}" />
                      </div>
                      <div data-branding-wrap class="admin-form-grid__full admin-form-grid">
                        ${storeBrandingFieldsHtml(s.plan_id, s)}
                      </div>
                      <div class="admin-form-grid__full admin-edit-panel__actions">
                        <button type="submit" class="btn btn-primary btn-sm">Salvar loja</button>
                        <button type="button" class="btn btn-outline btn-sm" data-cancel-store="${s.id}">Cancelar</button>
                      </div>
                    </form>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `
    )

    bindStoreForm(main)
    bindStoreEdits(main)
    bindPlanBrandingToggle(main)
    return
  }

  if (tab === 'products') {
    const [allProducts, stores, categories] = await Promise.all([
      fetchAdminProducts(),
      fetchAllStoresAdmin(),
      fetchCategories(),
    ])

    const counts = productCountMap(allProducts)
    const selectedStore = selectedStoreId ? stores.find((s) => s.id === selectedStoreId) : null
    const storeProducts = selectedStoreId
      ? allProducts.filter((p) => p.store_id === selectedStoreId)
      : []

    main.innerHTML = adminPage(
      menuItem.label,
      selectedStore
        ? `Gerenciando produtos de ${selectedStore.name}`
        : `${allProducts.length} produto(s) em ${stores.length} loja(s)`,
      `
        <div id="admin-product-msg"></div>
        <div class="admin-store-products-layout">
          ${renderStoreProductsSidebar(stores, counts, selectedStoreId)}
          ${renderStoreProductsPanel({
            store: selectedStore,
            products: storeProducts,
            categories,
            canCreate: selectedStore?.status === 'approved',
          })}
        </div>
      `
    )

    bindStoreProductsNav(main)
    bindProductForm(main, selectedStoreId)
    return
  }

  if (tab === 'account') {
    main.innerHTML = adminPage(
      menuItem.label,
      `Conta: ${user.email}`,
      `
        <form id="admin-password-form" class="admin-password-form">
          <div class="form-group">
            <label class="form-label">Nova senha</label>
            <input class="form-input" type="password" name="password" required minlength="6" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label class="form-label">Confirmar nova senha</label>
            <input class="form-input" type="password" name="confirm" required minlength="6" autocomplete="new-password" />
          </div>
          <div id="admin-password-msg"></div>
          <button type="submit" class="btn btn-primary btn-sm">Alterar senha</button>
        </form>
      `
    )

    bindPasswordForm(main)
  }
}

function bindStoreForm(main) {
  main.querySelector('#admin-store-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target
    const msgEl = main.querySelector('#admin-store-msg')
    const submitBtn = f.querySelector('button[type="submit"]')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Criando...' }
    try {
      const store = await createStoreAsAdmin({
        owner_id: f.owner_id.value,
        name: f.name.value.trim(),
        category_id: f.category_id.value,
        whatsapp: f.whatsapp.value.trim(),
        city: f.city.value.trim(),
        state: f.state.value.trim().toUpperCase(),
        description: f.description.value.trim(),
        address: f.address.value.trim(),
        opening_hours: f.opening_hours.value.trim(),
        theme_color: f.theme_color.value,
        plan_id: f.plan_id.value,
        approved: f.approved.checked,
      })

      const logoFile = f.logo?.files?.[0]
      const bannerFile = f.banner?.files?.[0]
      if (logoFile || bannerFile) {
        if (!planAllowsStoreBranding(f.plan_id.value)) {
          throw new Error(FREE_PLAN_BRANDING_MESSAGE)
        }
        await updateStoreAsAdmin(store.id, {
          plan_id: f.plan_id.value,
          logo: logoFile ?? undefined,
          banner: bannerFile ?? undefined,
        })
      }

      showToast(`Loja "${store.name}" criada!`)
      navigate('/admin/lojas')
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Criar loja' }
    }
  })
}

function bindStoreEdits(main) {
  main.querySelectorAll('[data-edit-store]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editStore
      main.querySelectorAll('.admin-edit-row[id^="edit-store-row-"]').forEach((row) => {
        row.hidden = row.id !== `edit-store-row-${id}`
      })
      const row = main.querySelector(`#edit-store-row-${id}`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })

  main.querySelectorAll('[data-cancel-store]').forEach((btn) => {
    btn.addEventListener('click', () => {
      main.querySelector(`#edit-store-row-${btn.dataset.cancelStore}`).hidden = true
    })
  })

  main.querySelectorAll('[data-store-edit]').forEach((form) => {
    const id = form.dataset.storeEdit
    const logoInput = form.querySelector('input[name="logo"]')
    const bannerInput = form.querySelector('input[name="banner"]')
    bindImagePreview(logoInput, form.querySelector(`[data-preview-logo="${id}"]`))
    bindImagePreview(bannerInput, form.querySelector(`[data-preview-banner="${id}"]`))

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const submitBtn = form.querySelector('button[type="submit"]')
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...' }
      try {
        await updateStoreAsAdmin(id, {
          name: form.name.value.trim(),
          whatsapp: form.whatsapp.value.trim(),
          city: form.city.value.trim(),
          state: form.state.value.trim().toUpperCase(),
          category_id: form.category_id.value,
          theme_color: form.theme_color.value,
          status: form.status.value,
          plan_id: form.plan_id.value,
          description: form.description.value.trim(),
          address: form.address.value.trim(),
          opening_hours: form.opening_hours.value.trim(),
          logo: logoInput?.files?.[0],
          banner: bannerInput?.files?.[0],
          remove_logo: !logoInput?.files?.[0] && form.remove_logo?.checked,
          remove_banner: !bannerInput?.files?.[0] && form.remove_banner?.checked,
        })
        showToast('Loja atualizada!')
        renderAdminDashboard(main, 'stores')
      } catch (err) {
        showToast(err.message)
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar loja' }
      }
    })
  })
}

function bindStoreProductsNav(main) {
  const search = main.querySelector('#admin-store-products-search')
  const items = main.querySelectorAll('[data-store-nav]')

  search?.addEventListener('input', () => {
    const term = search.value.trim().toLowerCase()
    items.forEach((item) => {
      const name = item.dataset.storeName ?? ''
      item.hidden = term.length > 0 && !name.includes(term)
    })
  })
}

function bindProductForm(main, selectedStoreId = null) {
  const createForm = main.querySelector('#admin-product-form')
  const createImageInput = createForm?.querySelector('input[name="image"]')
  bindImagePreview(createImageInput, main.querySelector('[data-preview-product-create]'))

  createForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const f = e.target
    const msgEl = main.querySelector('#admin-product-msg')
    const submitBtn = f.querySelector('button[type="submit"]')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Criando...' }
    try {
      const imageFile = f.image?.files?.[0]
      if (imageFile) {
        const err = validateImageFile(imageFile, STORAGE_BUCKETS.products)
        if (err) throw new Error(err)
      }
      const storeId = f.store_id.value
      await createProduct(storeId, {
        name: f.name.value.trim(),
        description: f.description.value.trim(),
        price: parseFloat(f.price.value),
        stock: parseInt(f.stock.value, 10),
        category_id: f.category_id.value,
        active: true,
        image: imageFile,
      })
      showToast('Produto criado!')
      navigate(adminProductsPath(storeId || selectedStoreId))
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Criar produto' }
    }
  })

  bindProductEdits(main, selectedStoreId)
}

function bindProductEdits(main, selectedStoreId = null) {
  main.querySelectorAll('[data-edit-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.editProduct
      main.querySelectorAll('.admin-edit-row[id^="edit-product-row-"]').forEach((row) => {
        row.hidden = row.id !== `edit-product-row-${id}`
      })
      const row = main.querySelector(`#edit-product-row-${id}`)
      row?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    })
  })

  main.querySelectorAll('[data-cancel-product]').forEach((btn) => {
    btn.addEventListener('click', () => {
      main.querySelector(`#edit-product-row-${btn.dataset.cancelProduct}`).hidden = true
    })
  })

  main.querySelectorAll('[data-product-edit]').forEach((form) => {
    const id = form.dataset.productEdit
    const imageInput = form.querySelector('input[name="image"]')
    bindImagePreview(imageInput, form.querySelector(`[data-preview-product="${id}"]`))

    form.addEventListener('submit', async (e) => {
      e.preventDefault()
      const submitBtn = form.querySelector('button[type="submit"]')
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...' }
      try {
        const imageFile = imageInput?.files?.[0]
        if (imageFile) {
          const err = validateImageFile(imageFile, STORAGE_BUCKETS.products)
          if (err) throw new Error(err)
        }
        await updateProduct(id, {
          name: form.name.value.trim(),
          description: form.description.value.trim(),
          price: parseFloat(form.price.value),
          stock: parseInt(form.stock.value, 10),
          category_id: form.category_id.value,
          active: form.active.value === 'true',
          image: imageFile,
        })
        showToast('Produto atualizado!')
        renderAdminDashboard(main, 'products', selectedStoreId)
      } catch (err) {
        showToast(err.message)
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar produto' }
      }
    })
  })

  main.querySelectorAll('[data-del-product]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Excluir este produto?')) return
      await deleteProduct(btn.dataset.delProduct)
      showToast('Produto excluído')
      renderAdminDashboard(main, 'products', selectedStoreId)
    })
  })
}

function bindPasswordForm(main) {
  main.querySelector('#admin-password-form')?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const form = e.target
    const msgEl = main.querySelector('#admin-password-msg')
    const password = form.password.value
    const confirm = form.confirm.value

    if (password !== confirm) {
      msgEl.innerHTML = '<div class="alert alert-error">As senhas não coincidem.</div>'
      return
    }

    const submitBtn = form.querySelector('button[type="submit"]')
    if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...' }

    try {
      await updatePassword(password)
      form.reset()
      msgEl.innerHTML = '<div class="alert alert-success">Senha alterada com sucesso.</div>'
      showToast('Senha atualizada!')
    } catch (err) {
      msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
    } finally {
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Alterar senha' }
    }
  })
}

function bindApprovalActions(main, tab) {
  main.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await approveStoreRegistration(btn.dataset.approve)
      showToast('Loja aprovada!')
      renderAdminDashboard(main, tab)
    })
  })

  main.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Rejeitar esta loja?')) return
      await rejectStoreRegistration(btn.dataset.reject)
      showToast('Loja rejeitada')
      renderAdminDashboard(main, tab)
    })
  })
}