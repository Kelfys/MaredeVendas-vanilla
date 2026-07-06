/** Redireciona /regras para a seção na página de login. */
export async function renderRules(main) {
  const { navigate } = await import('../router.js')
  navigate('/conta/entrar?sec=regras')
}