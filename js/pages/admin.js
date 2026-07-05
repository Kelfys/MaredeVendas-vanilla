/**
 * Painel administrativo — métricas, aprovações, CRUD de lojas e produtos.
 */
import {
  fetchAdminMetrics, fetchPendingStoreApprovals,
  approveStoreRegistration, rejectStoreRegistration,
  updatePassword, fetchMerchants, fetchAllStoresAdmin,
  fetchAdminProducts, createStoreAsAdmin, createProduct, deleteProduct,
  fetchCategories,
} from '../api.js'
import { getUser } from '../state.js'
import { escapeHtml, formatDate, formatCurrency, showToast } from '../utils.js'
import { STORE_THEME_COLORS } from '../config.js'

function guardAdmin(main) {
  const user = getUser()
  if (!user || user.role !== 'admin') {
    main.innerHTML = `<div class="empty-state"><h2>Acesso restrito</h2><p><a href="#/admin/entrar">Entrar como admin</a></p></div>`
    return null
  }
  return user
}

function adminShell(tab, content) {
  const tabs = [
    ['overview', 'Visão Geral', '#/admin'],
    ['stores', 'Lojas', '#/admin/lojas'],
    ['products', 'Produtos', '#/admin/produtos'],
    ['account', 'Minha Conta', '#/admin/conta'],
  ]

  return `
    <div class="dashboard">
      <div class="dashboard__header"><h1>Painel Admin</h1></div>
      <div class="tabs">
        ${tabs.map(([id, label, href]) => `
          <a href="${href}" class="tab ${tab === id ? 'active' : ''}">${label}</a>
        `).join('')}
      </div>
      ${content}
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

export async function renderAdminDashboard(main, tab = 'overview') {
  const user = guardAdmin(main)
  if (!user) return

  if (tab === 'overview') {
    const [metrics, pending] = await Promise.all([
      fetchAdminMetrics(),
      fetchPendingStoreApprovals(),
    ])

    main.innerHTML = adminShell('overview', `
      <div class="metrics">
        <div class="metric-card"><div class="metric-card__value">${metrics.totalStores}</div><div class="metric-card__label">Lojas</div></div>
        <div class="metric-card"><div class="metric-card__value">${metrics.totalProducts}</div><div class="metric-card__label">Produtos</div></div>
        <div class="metric-card"><div class="metric-card__value">${metrics.totalOrders}</div><div class="metric-card__label">Pedidos</div></div>
        <div class="metric-card"><div class="metric-card__value">${metrics.totalViews}</div><div class="metric-card__label">Visualizações</div></div>
        <div class="metric-card"><div class="metric-card__value">${metrics.pendingStores}</div><div class="metric-card__label">Pendentes</div></div>
      </div>

      <h2 style="font-size:1.125rem;margin-bottom:1rem">Aprovações pendentes (${pending.length})</h2>
      ${pending.length === 0
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
          </table></div>`}
    `)

    bindApprovalActions(main)
    return
  }

  if (tab === 'stores') {
    const [stores, merchants, categories] = await Promise.all([
      fetchAllStoresAdmin(),
      fetchMerchants(),
      fetchCategories(),
    ])

    main.innerHTML = adminShell('stores', `
      <div id="admin-store-msg"></div>
      ${merchants.length === 0
        ? '<div class="empty-state" style="margin-bottom:1rem"><p>Nenhum lojista cadastrado. Crie contas em <a href="#/lojista/cadastro">Área do Lojista</a> primeiro.</p></div>'
        : ''}
      <details class="admin-form-panel" open ${merchants.length === 0 ? 'style="opacity:0.6;pointer-events:none"' : ''}>
        <summary>+ Nova loja</summary>
        <form id="admin-store-form" class="admin-form-grid">
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
          <div class="form-group admin-form-grid__full">
            <label style="display:flex;align-items:center;gap:0.5rem;font-size:0.875rem">
              <input type="checkbox" name="approved" checked />
              Publicar loja imediatamente (aprovada e ativa)
            </label>
          </div>
          <div class="admin-form-grid__full">
            <button type="submit" class="btn btn-primary btn-sm">Criar loja</button>
          </div>
        </form>
      </details>

      <h2 style="font-size:1.125rem;margin:1.5rem 0 1rem">Todas as lojas (${stores.length})</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Loja</th><th>Lojista</th><th>Cidade</th><th>Status</th><th>Plano</th><th></th></tr></thead>
          <tbody>
            ${stores.length === 0 ? '<tr><td colspan="6">Nenhuma loja</td></tr>' : stores.map((s) => `
              <tr>
                <td><strong>${escapeHtml(s.name)}</strong><br><small>/${escapeHtml(s.slug)}</small></td>
                <td>${escapeHtml(s.owner?.name ?? '—')}<br><small>${escapeHtml(s.owner?.email ?? '')}</small></td>
                <td>${escapeHtml(s.city)}, ${escapeHtml(s.state)}</td>
                <td>${statusBadge(s.status)}</td>
                <td>${escapeHtml(s.plan_id)}</td>
                <td>${s.status === 'approved' ? `<a href="#/loja/${escapeHtml(s.slug)}" class="btn btn-outline btn-sm">Ver</a>` : ''}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)

    main.querySelector('#admin-store-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = e.target
      const msgEl = main.querySelector('#admin-store-msg')
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
        showToast(`Loja "${store.name}" criada!`)
        renderAdminDashboard(main, 'stores')
      } catch (err) {
        msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
      }
    })
    return
  }

  if (tab === 'products') {
    const [products, stores, categories] = await Promise.all([
      fetchAdminProducts(),
      fetchAllStoresAdmin(),
      fetchCategories(),
    ])

    const approvedStores = stores.filter((s) => s.status === 'approved')

    main.innerHTML = adminShell('products', `
      <div id="admin-product-msg"></div>
      <details class="admin-form-panel" open>
        <summary>+ Novo produto</summary>
        <form id="admin-product-form" class="admin-form-grid">
          <div class="form-group admin-form-grid__full">
            <label class="form-label">Loja</label>
            <select class="form-input" name="store_id" required>
              <option value="">Selecione a loja...</option>
              ${approvedStores.map((s) => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('')}
            </select>
          </div>
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
            <label class="form-label">Categoria do produto</label>
            <select class="form-input" name="category_id">
              <option value="">Sem categoria</option>
              ${categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
          <div class="form-group admin-form-grid__full">
            <label class="form-label">Descrição</label>
            <textarea class="form-input" name="description" rows="2"></textarea>
          </div>
          <div class="admin-form-grid__full">
            <button type="submit" class="btn btn-primary btn-sm">Criar produto</button>
          </div>
        </form>
      </details>

      <h2 style="font-size:1.125rem;margin:1.5rem 0 1rem">Produtos (${products.length})</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Produto</th><th>Loja</th><th>Preço</th><th>Estoque</th><th>Ativo</th><th></th></tr></thead>
          <tbody>
            ${products.length === 0 ? '<tr><td colspan="6">Nenhum produto</td></tr>' : products.map((p) => `
              <tr>
                <td>${escapeHtml(p.name)}</td>
                <td>${escapeHtml(p.store?.name ?? '—')}</td>
                <td>${formatCurrency(p.price)}</td>
                <td>${p.stock}</td>
                <td>${p.active ? '✓' : '✗'}</td>
                <td><button type="button" class="btn btn-outline btn-sm" data-del-product="${p.id}">Excluir</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `)

    main.querySelector('#admin-product-form')?.addEventListener('submit', async (e) => {
      e.preventDefault()
      const f = e.target
      const msgEl = main.querySelector('#admin-product-msg')
      try {
        await createProduct(f.store_id.value, {
          name: f.name.value.trim(),
          description: f.description.value.trim(),
          price: parseFloat(f.price.value),
          stock: parseInt(f.stock.value, 10),
          category_id: f.category_id.value,
          active: true,
        })
        showToast('Produto criado!')
        renderAdminDashboard(main, 'products')
      } catch (err) {
        msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
      }
    })

    main.querySelectorAll('[data-del-product]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Excluir este produto?')) return
        await deleteProduct(btn.dataset.delProduct)
        showToast('Produto excluído')
        renderAdminDashboard(main, 'products')
      })
    })
    return
  }

  if (tab === 'account') {
    main.innerHTML = adminShell('account', `
      <section class="admin-settings">
        <h2 style="font-size:1.125rem;margin-bottom:0.5rem">Minha conta</h2>
        <p style="font-size:0.875rem;color:var(--text-secondary);margin-bottom:1rem">
          Logado como <strong>${escapeHtml(user.email)}</strong>
        </p>
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
      </section>
    `)

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
        msgEl.innerHTML = '<div class="alert" style="background:var(--primary-50);color:var(--primary-700);padding:0.75rem;border-radius:var(--radius)">Senha alterada com sucesso.</div>'
        showToast('Senha atualizada!')
      } catch (err) {
        msgEl.innerHTML = `<div class="alert alert-error">${escapeHtml(err.message)}</div>`
      } finally {
        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Alterar senha' }
      }
    })
  }
}

function bindApprovalActions(main) {
  main.querySelectorAll('[data-approve]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await approveStoreRegistration(btn.dataset.approve)
      showToast('Loja aprovada!')
      renderAdminDashboard(main, 'overview')
    })
  })

  main.querySelectorAll('[data-reject]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Rejeitar esta loja?')) return
      await rejectStoreRegistration(btn.dataset.reject)
      showToast('Loja rejeitada')
      renderAdminDashboard(main, 'overview')
    })
  })
}