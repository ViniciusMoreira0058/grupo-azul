-- =====================================================================
-- GRUPO AZUL · 002 · Lembretes e tarefas do escritório
-- Rode uma vez no SQL Editor (New query → colar → Run). Pode rodar de novo sem problema.
-- Só administradores veem e editam.
-- =====================================================================
create table if not exists public.ga_lembretes (
  id         bigint generated always as identity primary key,
  titulo     text not null,
  obs        text,
  urgencia   text not null default 'normal' check (urgencia in ('urgente','normal','lembrar')),
  data       date,
  feito      boolean not null default false,
  feito_em   timestamptz,
  criado_por uuid references public.ga_equipe(id) on delete set null default public.ga_eu(),
  criado_em  timestamptz not null default now()
);
create index if not exists ga_lembretes_feito_idx on public.ga_lembretes (feito, data);

alter table public.ga_lembretes enable row level security;
drop policy if exists ga_lembretes_admin on public.ga_lembretes;
create policy ga_lembretes_admin on public.ga_lembretes for all to authenticated
  using (public.ga_acesso() = 'admin') with check (public.ga_acesso() = 'admin');
grant select, insert, update, delete on public.ga_lembretes to authenticated;
