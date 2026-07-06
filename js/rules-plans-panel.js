import { renderSubscriptionPlanCards } from './plans.js'

/** Painel de regras e planos exibido na página Entrar. */
export function renderRulesAndPlansContent() {
  const planCards = renderSubscriptionPlanCards()

  return `
    <div class="auth-info-panel">
      <h2 class="auth-info-panel__title" id="regras">Regras da Plataforma</h2>

      <section class="rules-section">
        <h3>1. Sobre o MaredeVendas</h3>
        <p>Marketplace local que conecta clientes a lojas da região. Pedidos são finalizados via WhatsApp — não há pagamento in-app.</p>
      </section>

      <section class="rules-section">
        <h3>2. Clientes</h3>
        <ul>
          <li>Não é obrigatório criar conta para comprar.</li>
          <li>Conta gratuita permite favoritar lojas e pré-preencher dados no checkout.</li>
          <li>Combine entrega e pagamento diretamente com a loja no WhatsApp.</li>
        </ul>
      </section>

      <section class="rules-section">
        <h3>3. Lojistas</h3>
        <ul>
          <li>Cadastro sujeito à aprovação do administrador.</li>
          <li>Informações da loja devem ser verdadeiras e atualizadas.</li>
          <li>Produtos com preço e estoque corretos.</li>
          <li>WhatsApp deve estar ativo para receber pedidos.</li>
        </ul>
      </section>

      <section class="rules-section" id="planos">
        <h3>4. Planos para lojistas</h3>
        <p>Escolha o plano que melhor se encaixa no tamanho da sua loja. O plano <strong>Gratuito</strong> é ativado após aprovação do cadastro. Para planos pagos, realize o pagamento e envie o comprovante pelo WhatsApp.</p>
        <div class="plan-grid">${planCards}</div>
        <div class="plan-payment-info">
          <p><strong>Como assinar um plano pago:</strong></p>
          <ol>
            <li>Realize o pagamento do valor mensal do plano escolhido.</li>
            <li>Clique no botão do plano escolhido acima para enviar o comprovante pelo WhatsApp.</li>
            <li>Informe o nome da loja e o email cadastrado na mensagem.</li>
            <li>Após confirmação, seu plano será ativado pelo administrador.</li>
          </ol>
        </div>
      </section>

      <section class="rules-section">
        <h3>5. Conduta</h3>
        <p>Conteúdo ilegal, discriminatório ou enganoso será removido. Lojas podem ser bloqueadas em caso de violação.</p>
      </section>
    </div>`
}