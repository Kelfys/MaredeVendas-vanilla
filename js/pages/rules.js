/** Página estática com regras e termos da plataforma. */
export async function renderRules(main) {
  main.innerHTML = `
    <div class="container-wide rules-page">
      <a href="#/" class="rules-page__back">← Voltar para as lojas</a>
      <div class="rules-page__card">
        <h1 class="rules-page__title">Regras da Plataforma</h1>

        <section class="rules-section">
          <h2>1. Sobre o MaredeVendas</h2>
          <p>Marketplace local que conecta clientes a lojas da região. Pedidos são finalizados via WhatsApp — não há pagamento in-app.</p>
        </section>

        <section class="rules-section">
          <h2>2. Clientes</h2>
          <ul>
            <li>Não é obrigatório criar conta para comprar.</li>
            <li>Conta gratuita permite favoritar lojas e pré-preencher dados no checkout.</li>
            <li>Combine entrega e pagamento diretamente com a loja no WhatsApp.</li>
          </ul>
        </section>

        <section class="rules-section">
          <h2>3. Lojistas</h2>
          <ul>
            <li>Cadastro sujeito à aprovação do administrador.</li>
            <li>Informações da loja devem ser verdadeiras e atualizadas.</li>
            <li>Produtos com preço e estoque corretos.</li>
            <li>WhatsApp deve estar ativo para receber pedidos.</li>
            <li>Planos pagos exigem comprovante e aprovação — veja os valores em <a href="#/lojista/entrar">Entrar como lojista</a>.</li>
          </ul>
        </section>

        <section class="rules-section">
          <h2>4. Conduta</h2>
          <p>Conteúdo ilegal, discriminatório ou enganoso será removido. Lojas podem ser bloqueadas em caso de violação.</p>
        </section>
      </div>
    </div>
  `
}