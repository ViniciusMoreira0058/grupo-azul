-- =====================================================================
-- GRUPO AZUL · 006 · Aba Usuários (quem está usando o app)
-- Guarda quando cada pessoa usou o app pela última vez.
-- Só a conta de suporte oculta (005) consegue ver a lista.
-- Rode uma vez no SQL Editor (New query → colar → Run). Pode rodar de novo sem problema.
-- =====================================================================
create table if not exists public.ga_presenca (
  equipe_id uuid primary key references public.ga_equipe(id) on delete cascade,
  visto_em  timestamptz not null default now(),
  aparelho  text
);
create table if not exists public.ga_acessos (
  id        bigint generated always as identity primary key,
  equipe_id uuid not null references public.ga_equipe(id) on delete cascade,
  em        timestamptz not null default now(),
  aparelho  text
);
create index if not exists ga_acessos_idx on public.ga_acessos (equipe_id, em desc);

-- ninguém lê nem grava direto: só pelas funções abaixo
alter table public.ga_presenca enable row level security;
alter table public.ga_acessos  enable row level security;

-- o app chama ao abrir (p_abriu = true) e a cada minuto enquanto está aberto
create or replace function public.ga_marcar_presenca(p_aparelho text, p_abriu boolean default false)
returns void language plpgsql security definer set search_path = ''
as $$
declare eu uuid := public.ga_eu(); ap text := left(coalesce(p_aparelho, ''), 40);
begin
  if eu is null then return; end if;
  insert into public.ga_presenca (equipe_id, visto_em, aparelho) values (eu, now(), ap)
  on conflict (equipe_id) do update set visto_em = now(), aparelho = excluded.aparelho;
  -- conta um acesso por abertura (no máximo um a cada 10 minutos)
  if p_abriu and not exists (select 1 from public.ga_acessos where equipe_id = eu and em > now() - interval '10 minutes') then
    insert into public.ga_acessos (equipe_id, aparelho) values (eu, ap);
  end if;
  delete from public.ga_acessos where em < now() - interval '90 days';
end $$;

-- lista de usuários: só para a conta de suporte oculta
create or replace function public.ga_usuarios()
returns json language sql stable security definer set search_path = ''
as $$
  select case when exists (select 1 from public.ga_equipe
                            where user_id = auth.uid() and ativo and oculto and acesso = 'admin')
  then coalesce((select json_agg(json_build_object(
          'id', e.id, 'nome', e.nome, 'funcao', e.funcao, 'acesso', e.acesso, 'ativo', e.ativo,
          'dono', e.dono, 'entrou', e.user_id is not null,
          'visto_em', p.visto_em, 'aparelho', p.aparelho,
          'acessos7', (select count(*) from public.ga_acessos a where a.equipe_id = e.id and a.em > now() - interval '7 days'))
          order by p.visto_em desc nulls last)
        from public.ga_equipe e left join public.ga_presenca p on p.equipe_id = e.id), '[]')
  else null end
$$;

revoke all on function public.ga_marcar_presenca(text, boolean), public.ga_usuarios() from public, anon;
grant execute on function public.ga_marcar_presenca(text, boolean), public.ga_usuarios() to authenticated;
