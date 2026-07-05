/**
 * Painel do lojista — CRUD de produtos, pedidos e configurações da loja.
 *
 * Abas: overview, products, orders, settings (via rotas /dashboard/*).
 * guardMerchant() bloqueia acesso de não-lojistas.
 *
 * Melhorias futuras:
 * - Edição de estoque em lote
 * - Gráficos de vendas e visualizações
 * - Notificações de novos pedidos (Realtime)
 * - Cooldown de alteração de preço (regra já existe no schema)
 */
import {
  fetchStoreByOwner, fetchMerchantProducts, fetchOrdersByStore,
  createProduct, updateProduct, deleteProduct, updateStore, fetchCategories,
} from '../api.js'
import { getUser } from '../state.js'
import { navigate } from '../router.js'
import { escapeHtml, formatCurrency, formatDate } from '../utils.js'
import { STORE_THEME_COLORS } from '../config.js'
import { planAllowsStoreBranding, FREE_PLAN_BRANDING_MESSAGE } from '../plans.js'
import { STORE_BRANDING_UPLOAD_HINT } from '../uploads.js'

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

function merchantBrandingSection(store) {
  if (!planAllowsStoreBranding(store.plan_id)) {
    return `
      <section class="merchant-branding merchant-branding--locked">
        <h2 class="merchant-branding__title">Logo e banner</h2>
        <p class="form-hint form-hint--info">${escapeHtml(FREE_PLAN_BRANDING_MESSAGE)}</p>
        <p style="margin-top:0.75rem;font-size:0.875rem">
          <a href="#/regras">Ver planos e fazer upgrade</a>
        </p>
        ${store.logo || store.banner ? `
          <div class="merchant-branding__readonly" style="margin-top:1rem">
            <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:0.5rem">Imagens atuais (somente leitura no plano Gratuito):</p>
            <div style="display:flex;gap:1rem;flex-wrap:wrap;align-items:flex-start">
              ${store.logo ? `<div>${imagePreviewBlock(store.logo, store.name, 'square')}</div>` : ''}
              ${store.banner ? `<div style="flex:1;min-width:12rem">${imagePreviewBlock(store.banner, store.name, 'banner')}</div>` : ''}
            </div>
          </div>` : ''}
      </section>`
  }

  return `
    <section class="merchant-branding">
      <h2 class="merchant-branding__title">Logo e banner</h2>
      <p style="font-size:0.8125rem;color:var(--text-secondary);margin-bottom:1rem">${STORE_BRANDING_UPLOAD_HINT}</p>
      <div class="form-group">
        <label class="form-label">Logo da loja</label>
        <div class="admin-image-field">
          <div data-preview-logo>${imagePreviewBlock(store.logo, store.name, 'square')}</div>
          <input class="form-input" type="file" name="logo" accept="image/*" />
        </div>
        ${store.logo ? '<label class="admin-check"><input type="checkbox" name="remove_logo" /> Remover logo atual</label>' : ''}
      </div>
      <div class="form-group">
        <label class="form-label">Banner da loja</label>
        <div class="admin-image-field">
          <div data-preview-banner>${imagePreviewBlock(store.banner, store.name, 'banner')}</div>
          <input class="form-input" type="file" name="banner" accept="image/*" />
        </div>
        ${store.banner ? '<label class="admin-check"><input type="checkbox" name="remove_banner" /> Remover banner atual</label>' : ''}
      </div>
    </section>`
}

function guardMerchant(main) {
  const user = getUser()
  if (!user || user.role !== 'merchant') {
    main.innerHTML = `<div class="empty-state"><h2>Acesso restrito</h2><p><a href="#/lojista/entrar">Entrar como lojista</a></p></div>`
    return null
  }
  return user
}

function dashboardShell(title, tab, content) {
  const tabs = [
    ['overview', 'Visão Geral', '#/dashboard'],
    ['products', 'Produtos', '#/dashboard/produtos'],
    ['orders', 'Pedidos', '#/dashboard/pedidos'],
    ['settings', 'Configurações', '#/dashboard/configuracoes'],
  ]

  return `
    <div class="dashboard">
      <div class="dashboard__header"><h1>${escapeHtml(title)}</h1></div>
      <div class="tabs">
        ${tabs.map(([id, label, href]) => `
          <a href="${href}" class="tab ${tab === id ? 'active' : ''}">${label}</a>
        `).join('')}
      </div>
      ${content}
    </div>
  `
}

export async function renderMerchantDashboard(main, tab = 'overview') {
  const user = guardMerchant(main)
  if (!user) return

  const store = await fetchStoreByOwner(user.id)
  if (!store) {
    main.innerHTML = `<div class="empty-state"><h2>Nenhuma loja cadastrada</h2><a href="#/lojista/cadastro" class="btn btn-primary">Cadastrar loja</a></div>`
    return
  }

  if (tab === 'overview') {
    const [products, orders] = await Promise.all([
      fetchMerchantProducts(store.id),
      fetchOrdersByStore(store.id),
    ])

    const statusBadge = {
      pending: '<span class="badge badge-pending">Aguardando aprovação</span>',
      approved: '<span class="badge badge-approved">Aprovada</span>',
      blocked: '<span class="badge badge-blocked">Bloqueada</span>',
    }

    main.innerHTML = dashboardShell('Painel do Lojista', 'overview', `
      <div style="margin-bottom:1rem">${statusBadge[store.status] ?? ''}</div>
      <div class="metrics">
        <div class="metric-card"><div class="metric-card__value">${products.length}</div><div class="metric-card__label">Produtos</div></div>
        <div class="metric-card"><div class="metric-card__value">${orders.length}</div><div class="metric-card__label">Pedidos</div></div>
        <div class="metric-card"><div class="metric-card__value">${store.plan_id}</div><div class="metric-card__label">Plano</div></div>
      </div>
      ${store.status === 'approved' ? `<a href="#/loja/${escapeHtml(store.slug)}" class="btn btn-primary">Ver minha loja pública</a>` : '<p style="color:var(--text-secondary);font-size:0.875rem">Sua loja ficará visível após aprovação do admin.</p>'}
    `)
    return
  }

  if (tab === 'products') {
    const products = await fetchMerchantProducts(store.id)
    const categories = await fetchCategories()

    main.innerHTML = dashboardShell('Produtos', 'products', `
      <div id="product-msg"></div>
      <details style="margin-bottom:1.5rem;padding:1rem;border:1px solid var(--border);border-radius:var(--radius-xl);background:var(--surface)">
        <summary style="cursor:pointer;font-weight:600">+ Novo produto</summary>
        <form id="product-form" style="margin-top:1rem">
          <div class="form-group"><input class="form-input" name="name" placeholder="Nome" required /></div>
          <div class="form-group"><textarea class="form-input" name="description" placeholder="Descrição" rows="2"></textarea></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.5rem">
            <input class="form-input" name="price" type="number" step="0.01" min="0" placeholder="Preço" required />
            <input class="form-input" name="stock" type="number" min="0" placeholder="Estoque" required />
          </div>
          <div class="form-group" style="margin-top:0.5rem">
            <select class="form-input" name="category_id"><option value="">Sem categoria</option>
              ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <button type="submit" class="btn btn-primary btn-sm">Salvar produto</button>
        </form>
      </details>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Preço</th><th>Estoque</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${products.length === 0 ? '<tr><td colspan="5">Nenhum produto</td></tr>' : products.map((p) => `
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${formatCurrency(p.price)}</td>
                <td>${p.stock}</td>
                <td>${p.active ? '✓' : '✗'}</td>
                <td><button type="button" class="btn btn-outline btn-sm" data-del="${p.id}">Excluir</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)

    main.querySelector('#product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = e.target
      try {
        await createProduct(store.id, {
          name: f.name.value,
          description: f.description.value,
          price: parseFloat(f.price.value),
          stock: parseInt(f.stock.value, 10),
          category_id: f.category_id.value,
          active: true,
        })
        renderMerchantDashboard(main, 'products')
      } catch (err) {
        main.querySelector('#product-msg').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
      }
    })

    main.querySelectorAll('[data-del]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir produto?')) return
        await deleteProduct(btn.dataset.del)
        renderMerchantDashboard(main, 'products')
      })
    })
    return
  }

  if (tab === 'orders') {
    const orders = await fetchOrdersByStore(store.id)

    main.innerHTML = dashboardShell('Pedidos', 'orders', `
      <div class="table-wrap">
        <table>
          <thead><tr><th>Data</th><th>Cliente</th><th>Telefone</th><th>Total</th><th>Status</th></tr></thead>
          <tbody>
            ${orders.length === 0 ? '<tr><td colspan="5">Nenhum pedido</td></tr>' : orders.map((o) => `
              <tr>
                <td>${formatDate(o.created_at)}</td>
                <td>${escapeHtml(o.customer_name)}</td>
                <td>${escapeHtml(o.customer_phone)}</td>
                <td>${formatCurrency(o.total)}</td>
                <td>${o.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)
    return
  }

  if (tab === 'settings') {
    const categories = await fetchCategories()

    main.innerHTML = dashboardShell('Configurações', 'settings', `
      <div id="settings-msg"></div>
      <form id="settings-form" class="merchant-settings-form">
        <div class="form-group"><label class="form-label">Nome</label><input class="form-input" name="name" value="${escapeHtml(store.name)}" required /></div>
        <div class="form-group"><label class="form-label">WhatsApp</label><input class="form-input" name="whatsapp" value="${escapeHtml(store.whatsapp)}" required /></div>
        <div class="form-group"><label class="form-label">Descrição</label><textarea class="form-input" name="description" rows="2">${escapeHtml(store.description ?? '')}</textarea></div>
        <div class="form-group"><label class="form-label">Categoria</label>
          <select class="form-input" name="category_id">
            ${categories.map((c) => `<option value="${c.id}" ${store.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Cor do tema</label>
          <select class="form-input" name="theme_color">
            ${STORE_THEME_COLORS.map((c) => `<option value="${c.id}" ${store.theme_color === c.id ? 'selected' : ''}>${c.id}</option>`).join('')}
          </select>
        </div>
        <div class="form-group"><label class="form-label">Horário</label><input class="form-input" name="opening_hours" value="${escapeHtml(store.opening_hours ?? '')}" /></div>
        ${merchantBrandingSection(store)}
        <button type="submit" class="btn btn-primary">Salvar</button>
      </form>
    `)

    const form = main.querySelector('#settings-form')
    if (planAllowsStoreBranding(store.plan_id)) {
      bindImagePreview(form.querySelector('input[name="logo"]'), form.querySelector('[data-preview-logo]'))
      bindImagePreview(form.querySelector('input[name="banner"]'), form.querySelector('[data-preview-banner]'))
    }

    form?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = e.target
      const submitBtn = f.querySelector('button[type="submit"]')
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Salvando...' }
      try {
        const payload = {
          name: f.name.value,
          whatsapp: f.whatsapp.value,
          description: f.description.value,
          category_id: f.category_id.value,
          theme_color: f.theme_color.value,
          opening_hours: f.opening_hours.value,
        }

        if (planAllowsStoreBranding(store.plan_id)) {
          const logoFile = f.logo?.files?.[0]
          const bannerFile = f.banner?.files?.[0]
          if (logoFile) payload.logo = logoFile
          if (bannerFile) payload.banner = bannerFile
          if (!logoFile && f.remove_logo?.checked) payload.remove_logo = true
          if (!bannerFile && f.remove_banner?.checked) payload.remove_banner = true
        }

        await updateStore(store.id, payload)
        main.querySelector('#settings-msg').innerHTML = '<div class="alert alert-success">Salvo!</div>'
        if (planAllowsStoreBranding(store.plan_id) && (payload.logo || payload.banner || payload.remove_logo || payload.remove_banner)) {
          renderMerchantDashboard(main, 'settings')
        }
      } catch (err) {
        main.querySelector('#settings-msg').innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Salvar' }
      }
    })
  }
}