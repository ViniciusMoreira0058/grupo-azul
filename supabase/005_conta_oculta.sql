-- =====================================================================
-- GRUPO AZUL · 005 · Conta de suporte oculta
-- A conta de Vinicius (suporte) continua administradora, mas não aparece
-- para os outros usuários: some de Funcionários e das listas de nomes.
-- Rode uma vez no SQL Editor (New query → colar → Run). Pode rodar de novo sem problema.
-- =====================================================================
alter table public.ga_equipe add column if not exists oculto boolean not null default false;
update public.ga_equipe set oculto = true where lower(email) = 'barbeariavm0058@gmail.com';

-- administradores leem e editam a equipe, menos a conta oculta (que só vê a si mesma)
drop policy if exists ga_equipe_ler on public.ga_equipe;
create policy ga_equipe_ler on public.ga_equipe for select to authenticated
  using ((public.ga_acesso() = 'admin' and not oculto) or user_id = auth.uid());
drop policy if exists ga_equipe_admin on public.ga_equipe;
create policy ga_equipe_admin on public.ga_equipe for all to authenticated
  using (public.ga_acesso() = 'admin' and (not oculto or user_id = auth.uid()))
  with check (public.ga_acesso() = 'admin' and (not oculto or user_id = auth.uid()));

-- nomes para Financeiro e Funcionário: sem a conta oculta, e agora com o perfil de cada um
create or replace function public.ga_nomes()
returns json language sql stable security definer set search_path = ''
as $$
  select case when public.ga_acesso() is null then null else json_build_object(
    'equipe', coalesce((select json_agg(json_build_object('id', e.id, 'nome', e.nome, 'funcao', e.funcao, 'ativo', e.ativo, 'acesso', e.acesso))
                          from public.ga_equipe e
                         where not e.oculto or e.user_id = auth.uid()), '[]'),
    'clientes', coalesce((select json_agg(json_build_object('id', c.id, 'nome', c.nome, 'cidade', c.cidade))
                            from public.ga_clientes c
                           where public.ga_acesso() in ('admin','fin')
                              or exists (select 1 from public.ga_obras o
                                          where o.cliente_id = c.id and public.ga_na_obra(o.id))), '[]')
  ) end
$$;
