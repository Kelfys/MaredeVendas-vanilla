#!/usr/bin/env bash
# Copia index.html para rotas estáticas — GitHub Pages responde 200 em vez de 404.
set -euo pipefail

ROOT="${1:-dist}"
SHELL="${ROOT}/index.html"

routes=(
  admin
  admin/entrar
  admin/lojas
  admin/produtos
  admin/pedidos
  admin/aprovacoes
  admin/moderadores
  admin/conta
  moderador
  moderador/entrar
  moderador/aprovacoes
  moderador/lojas
  moderador/produtos
  moderador/pedidos
  moderador/conta
  conta/entrar
  conta/criar
  lojista/entrar
  lojista/cadastro
  dashboard
  dashboard/produtos
  dashboard/pedidos
  dashboard/anuncios
  dashboard/planos
  dashboard/configuracoes
  dashboard/conta
  favoritos
  regras
  auth/callback
)

for route in "${routes[@]}"; do
  mkdir -p "${ROOT}/${route}"
  cp "${SHELL}" "${ROOT}/${route}/index.html"
done