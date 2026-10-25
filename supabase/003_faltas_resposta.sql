-- =====================================================================
-- GRUPO AZUL · 003 · Resposta do escritório aos pedidos de material
-- O dono marca o pedido como resolvido ou manda uma mensagem que o
-- funcionário vê na obra. Rode uma vez no SQL Editor (pode rodar de novo).
-- =====================================================================
alter table public.ga_faltas add column if not exists resposta     text;
alter table public.ga_faltas add column if not exists resposta_em  timestamptz;
alter table public.ga_faltas add column if not exists resolvido_em timestamptz;
