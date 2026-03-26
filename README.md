# Gera Pedidos

Sistema web para controlar quantidade de pedidos enviados por cada centro de distribuicao (CD), com lancamento diario e dashboard com totais e ranking.

## Stack

- Next.js (App Router + TypeScript)
- Supabase (Auth + Postgres)
- Tailwind CSS
- Vercel (deploy)

## Requisitos

- Node.js 20+ (ou 22+)
- Conta no Supabase (plano Free)
- Conta no GitHub
- Conta na Vercel (Hobby)

## 1) Configurar banco no Supabase

1. Crie um novo projeto no Supabase.
2. Abra o SQL Editor.
3. Rode o arquivo [`supabase/schema.sql`](supabase/schema.sql).
4. No painel de Authentication, crie os usuarios (um gestor e usuarios dos CDs).
5. Para cada usuario criado, insira um registro na tabela `profiles` com:
   - `id` = mesmo UUID do usuario em `auth.users`
   - `role` = `manager` ou `cd_user`
   - `distribution_center_id` preenchido para `cd_user`
   - `full_name`

## 2) Configurar variaveis de ambiente

1. Copie `.env.example` para `.env.local`.
2. Preencha:

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

Esses valores ficam em: Supabase > Project Settings > API.

## 3) Rodar local

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

## 4) Deploy na Vercel (gratis)

1. Suba o repositorio no GitHub.
2. Na Vercel, importe o projeto do GitHub.
3. Configure as mesmas variaveis de ambiente (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Deploy.

## Funcionalidades MVP

- Login com Supabase Auth
- Lancamento diario de pedidos por CD
- Regra de um lancamento por CD por dia (com edicao por upsert)
- Dashboard com:
  - total do dia
  - total do mes
  - total do ano
  - ranking mensal por CD
  - CD campeao do mes

## Observacao

Neste ambiente de desenvolvimento nao havia `node`/`npm` instalados, entao o projeto foi estruturado manualmente e nao foi possivel executar `npm install`/`npm run dev` aqui.
