# Modelo — copie para SECRETS.local.md e preencha

```bash
cp SECRETS.local.example.md SECRETS.local.md
```

`SECRETS.local.md` está no `.gitignore` e **não** vai para o GitHub.

## Contas (preencher localmente)

| Papel | Email | Senha |
|-------|-------|-------|
| Cliente demo | | |
| Admin | | |
| Moderador | | |
| Lojas fake seed | lojasfake@gmail.com | |
| Produtos fake seed | produtosfake@gmail.com | |

## Banco

- `DATABASE_URL` → arquivo `.env.local` (ver `.env.example`)

## Nunca versionar

- `service_role` do Supabase  
- senha do Postgres  
- senha do admin de produção  
