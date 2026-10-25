-- =====================================================================
-- GRUPO AZUL · 004 · Dados da empresa no PDF e observações no orçamento
-- Rode uma vez no SQL Editor (New query → colar → Run). Pode rodar de novo sem problema.
-- Administrador e Financeiro leem e editam.
-- =====================================================================
create table if not exists public.ga_empresa (
  id            int primary key default 1 check (id = 1),
  dados         jsonb not null default '{}',
  atualizado_em timestamptz not null default now()
);

alter table public.ga_empresa enable row level security;
drop policy if exists ga_empresa_escritorio on public.ga_empresa;
create policy ga_empresa_escritorio on public.ga_empresa for all to authenticated
  using (public.ga_acesso() in ('admin','fin')) with check (public.ga_acesso() in ('admin','fin'));
grant select, insert, update on public.ga_empresa to authenticated;

alter table public.ga_orcamentos add column if not exists nota text;
