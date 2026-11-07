-- ============================================================================
-- KORVEN · banco de dados completo (Supabase / PostgreSQL)
--
-- Como usar: crie um projeto no Supabase, abra "SQL Editor", cole este arquivo inteiro e rode UMA vez.
-- Depois (opcional) rode supabase/seed.sql para ter dados de demonstração e contas de teste.
-- Em seguida implante a Edge Function de supabase/functions/gerenciar-usuarios (veja docs/banco-de-dados.md).
--
-- Ordem: tipos -> usuario, cliente, motorista -> entrega, item, historico_entrega, integracao_api
--        -> funções de regra de negócio -> permissões e RLS -> funções da API de integração.
-- ============================================================================

create extension if not exists pgcrypto with schema extensions;


-- ============================================================================
-- 1. TIPOS
-- ============================================================================

create type public.perfil_acesso as enum ('admin', 'operador', 'motorista', 'cliente', 'sistema');
create type public.disponibilidade_motorista as enum ('disponivel', 'em_entrega', 'indisponivel');
create type public.status_entrega as enum ('solicitada', 'coletada', 'saiu_cd', 'em_rodovia', 'na_cidade', 'saiu_entrega', 'entregue');
create type public.status_integracao as enum ('ativa', 'inativa');


-- ============================================================================
-- 2. USUÁRIO, CLIENTE E MOTORISTA
-- ============================================================================

-- perfil de acesso de quem entra pelo Supabase Auth (id = auth.users.id)
create table public.usuario (
  id uuid primary key references auth.users (id) on delete cascade,
  nome text not null,
  perfil_acesso text not null default 'cliente'
    check (perfil_acesso in ('admin', 'operador', 'motorista', 'cliente', 'sistema')),
  data_cadastro timestamptz not null default now()
);

create table public.cliente (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid unique references public.usuario (id) on delete set null,
  nome text not null,
  cpf_cnpj text,
  email text,
  telefone text,
  endereco text,
  data_cadastro timestamptz not null default now()
);

create table public.motorista (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid unique references public.usuario (id) on delete set null,
  nome text not null,
  cpf text,
  cnh text,
  telefone text,
  email text,
  disponibilidade public.disponibilidade_motorista not null default 'disponivel'
);

create unique index cliente_cpf_cnpj_uq on public.cliente (cpf_cnpj) where cpf_cnpj is not null;
create unique index motorista_cpf_uq on public.motorista (cpf) where cpf is not null;
create unique index motorista_cnh_uq on public.motorista (cnh) where cnh is not null;


-- ============================================================================
-- 3. ENTREGA, ITEM, HISTÓRICO E INTEGRAÇÃO DE API
-- ============================================================================

create table public.entrega (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente (id),
  motorista_id uuid references public.motorista (id) on delete set null,
  codigo_pedido_externo text not null check (length(btrim(codigo_pedido_externo)) between 1 and 60),
  codigo_rastreamento text not null unique,
  nome_destinatario text not null check (length(btrim(nome_destinatario)) > 0),
  documento_destinatario text,
  endereco_origem text not null check (length(btrim(endereco_origem)) > 0),
  endereco_destino text not null check (length(btrim(endereco_destino)) > 0),
  data_solicitacao timestamptz not null default now(),
  data_prevista timestamptz not null,
  data_conclusao timestamptz,
  status public.status_entrega not null default 'solicitada',
  valor_frete numeric(12, 2) not null default 0 check (valor_frete >= 0),
  constraint entrega_pedido_unico unique (cliente_id, codigo_pedido_externo),
  constraint entrega_conclusao_coerente check ((status = 'entregue') = (data_conclusao is not null))
);

create table public.item (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entrega (id) on delete cascade,
  descricao text not null check (length(btrim(descricao)) > 0),
  quantidade integer not null check (quantidade > 0),
  peso numeric(10, 3) not null default 0 check (peso >= 0),
  valor_declarado numeric(12, 2) check (valor_declarado is null or valor_declarado >= 0)
);

create table public.historico_entrega (
  id uuid primary key default gen_random_uuid(),
  entrega_id uuid not null references public.entrega (id) on delete cascade,
  status_anterior public.status_entrega,
  status_novo public.status_entrega not null,
  data_alteracao timestamptz not null default now(),
  observacao text check (observacao is null or length(observacao) <= 500),
  usuario_id uuid references public.usuario (id)
);

create table public.integracao_api (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente (id) on delete cascade,
  nome text not null check (length(btrim(nome)) > 0),
  chave_identificacao text not null unique,
  segredo text not null,
  status public.status_integracao not null default 'ativa',
  data_criacao timestamptz not null default now(),
  data_ultima_utilizacao timestamptz
);

comment on column public.integracao_api.segredo is 'Hash SHA-256 (hex) do segredo. O segredo em texto puro nunca é guardado.';
comment on column public.historico_entrega.status_anterior is 'Nulo no primeiro registro (criação da entrega).';

create index entrega_cliente_idx on public.entrega (cliente_id);
create index entrega_motorista_idx on public.entrega (motorista_id) where motorista_id is not null;
create index entrega_status_idx on public.entrega (status);
create index entrega_prevista_idx on public.entrega (data_prevista);
create index entrega_solicitacao_idx on public.entrega (data_solicitacao desc);
create index item_entrega_idx on public.item (entrega_id);
create index historico_entrega_idx on public.historico_entrega (entrega_id, data_alteracao);
create index historico_usuario_idx on public.historico_entrega (usuario_id) where usuario_id is not null;
create index integracao_cliente_idx on public.integracao_api (cliente_id);

alter table public.usuario enable row level security;
alter table public.cliente enable row level security;
alter table public.motorista enable row level security;
alter table public.entrega enable row level security;
alter table public.item enable row level security;
alter table public.historico_entrega enable row level security;
alter table public.integracao_api enable row level security;


-- ============================================================================
-- 4. REGRAS DE NEGÓCIO: funções auxiliares (schema private, não exposto pela API) e RPCs
--    Escritas em entrega/item/historico só acontecem por aqui, sempre validando o perfil de quem chama.
-- ============================================================================

create schema if not exists private;
grant usage on schema private to authenticated;

create function private.perfil() returns text
language sql stable security definer set search_path = '' as $$
  select u.perfil_acesso from public.usuario u where u.id = (select auth.uid())
$$;

create function private.cliente_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select c.id from public.cliente c where c.usuario_id = (select auth.uid())
$$;

create function private.motorista_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select m.id from public.motorista m where m.usuario_id = (select auth.uid())
$$;

-- a entrega (por cliente/motorista) é visível para quem está logado?
create function private.escopo(p_cliente uuid, p_motorista uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select case private.perfil()
    when 'admin' then true
    when 'operador' then true
    when 'cliente' then p_cliente is not null and p_cliente = private.cliente_id()
    when 'motorista' then p_motorista is not null and p_motorista = private.motorista_id()
    else false
  end
$$;

-- próximo status que o perfil de quem chama pode registrar (nulo = nenhum)
create function private.proximo_permitido(p_status public.status_entrega, p_motorista uuid)
returns public.status_entrega
language plpgsql stable security definer set search_path = '' as $$
declare
  v_prox public.status_entrega;
  v_perfil text := private.perfil();
begin
  if p_status = 'entregue' then
    return null;
  end if;

  v_prox := (enum_range(p_status, null::public.status_entrega))[2];

  if v_perfil = 'admin' then
    return v_prox;
  elsif v_perfil = 'operador' and v_prox in ('coletada', 'saiu_cd') then
    return v_prox;
  elsif v_perfil = 'motorista' and p_motorista is not null and p_motorista = private.motorista_id()
        and v_prox in ('em_rodovia', 'na_cidade', 'saiu_entrega', 'entregue') then
    return v_prox;
  end if;

  return null;
end $$;

-- motorista fica "em_entrega" enquanto tiver carga entre saiu_cd e saiu_entrega (respeita "indisponivel")
create function private.recalcular_disponibilidade(p_motorista uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_motorista is null then
    return;
  end if;

  update public.motorista m
     set disponibilidade = case
           when exists (select 1 from public.entrega e
                         where e.motorista_id = m.id
                           and e.status in ('saiu_cd', 'em_rodovia', 'na_cidade', 'saiu_entrega'))
           then 'em_entrega'::public.disponibilidade_motorista
           else 'disponivel'::public.disponibilidade_motorista
         end
   where m.id = p_motorista and m.disponibilidade <> 'indisponivel';
end $$;

-- motorista só altera telefone e disponibilidade; admin altera tudo
create function private.motorista_guard() returns trigger
language plpgsql set search_path = '' as $$
begin
  if current_user <> 'authenticated' or private.perfil() = 'admin' then
    return new;
  end if;

  if new.nome is distinct from old.nome or new.cpf is distinct from old.cpf or new.cnh is distinct from old.cnh
     or new.email is distinct from old.email or new.usuario_id is distinct from old.usuario_id then
    raise exception 'Você só pode alterar telefone e disponibilidade.' using errcode = '42501';
  end if;

  if new.disponibilidade is distinct from old.disponibilidade
     and (old.disponibilidade = 'em_entrega' or new.disponibilidade = 'em_entrega') then
    raise exception 'A disponibilidade "em entrega" é controlada pelo sistema.' using errcode = 'P0001';
  end if;

  return new;
end $$;

create trigger motorista_guard before update on public.motorista
for each row execute function private.motorista_guard();

grant execute on all functions in schema private to authenticated;


-- ---------- criar entrega (cliente, operador, admin) ----------

create function public.criar_entrega(
  p_cliente_id uuid,
  p_codigo_pedido_externo text,
  p_nome_destinatario text,
  p_documento_destinatario text,
  p_endereco_origem text,
  p_endereco_destino text,
  p_data_prevista timestamptz,
  p_itens jsonb
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_perfil text := private.perfil();
  v_cliente uuid;
  v_pedido text := btrim(coalesce(p_codigo_pedido_externo, ''));
  v_prevista timestamptz;
  v_peso numeric;
  v_frete numeric(12, 2);
  v_id uuid;
  v_codigo text;
  v_try int := 0;
  v_constraint text;
begin
  if v_perfil is null or v_perfil not in ('admin', 'operador', 'cliente') then
    raise exception 'Você não tem permissão para criar entregas.' using errcode = '42501';
  end if;

  v_cliente := case when v_perfil = 'cliente' then private.cliente_id() else p_cliente_id end;

  if v_cliente is null then
    raise exception 'Escolha o cliente da entrega.' using errcode = 'P0001';
  end if;

  if not exists (select 1 from public.cliente where id = v_cliente) then
    raise exception 'Cliente não encontrado.' using errcode = 'P0001';
  end if;

  if v_pedido = '' or length(v_pedido) > 60 then
    raise exception 'Informe o código do pedido (até 60 caracteres).' using errcode = 'P0001';
  end if;

  -- pedido repetido do mesmo cliente: devolve a entrega existente
  select e.id, e.codigo_rastreamento into v_id, v_codigo
    from public.entrega e where e.cliente_id = v_cliente and e.codigo_pedido_externo = v_pedido;

  if found then
    return jsonb_build_object('id', v_id, 'codigo_rastreamento', v_codigo, 'duplicada', true);
  end if;

  if btrim(coalesce(p_nome_destinatario, '')) = '' then
    raise exception 'Informe o nome do destinatário.' using errcode = 'P0001';
  end if;

  if btrim(coalesce(p_endereco_origem, '')) = '' or btrim(coalesce(p_endereco_destino, '')) = '' then
    raise exception 'Informe o endereço de origem e o de destino.' using errcode = 'P0001';
  end if;

  if p_itens is null or jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then
    raise exception 'Inclua ao menos um item na entrega.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from jsonb_to_recordset(p_itens) as x(descricao text, quantidade int, peso numeric, valor_declarado numeric)
     where btrim(coalesce(x.descricao, '')) = '' or coalesce(x.quantidade, 0) <= 0
        or coalesce(x.peso, -1) < 0 or coalesce(x.valor_declarado, 0) < 0
  ) then
    raise exception 'Confira os itens: descrição, quantidade (maior que 0) e peso são obrigatórios.' using errcode = 'P0001';
  end if;

  if p_data_prevista is not null and p_data_prevista <= now() then
    raise exception 'A data prevista precisa ser futura.' using errcode = 'P0001';
  end if;

  v_prevista := coalesce(p_data_prevista, now() + interval '5 days');

  select coalesce(sum(x.peso), 0) into v_peso
    from jsonb_to_recordset(p_itens) as x(descricao text, quantidade int, peso numeric, valor_declarado numeric);

  -- frete: taxa fixa + valor por kg
  v_frete := round(25 + 2.8 * v_peso, 2);

  loop
    v_try := v_try + 1;
    v_codigo := 'KV-' || lpad((100000 + floor(random() * 900000))::int::text, 6, '0');

    begin
      insert into public.entrega (cliente_id, codigo_pedido_externo, codigo_rastreamento, nome_destinatario,
                                  documento_destinatario, endereco_origem, endereco_destino, data_prevista, valor_frete)
      values (v_cliente, v_pedido, v_codigo, btrim(p_nome_destinatario), nullif(btrim(coalesce(p_documento_destinatario, '')), ''),
              btrim(p_endereco_origem), btrim(p_endereco_destino), v_prevista, v_frete)
      returning id into v_id;

      exit;
    exception when unique_violation then
      get stacked diagnostics v_constraint = constraint_name;

      if v_constraint = 'entrega_pedido_unico' then
        select e.id, e.codigo_rastreamento into v_id, v_codigo
          from public.entrega e where e.cliente_id = v_cliente and e.codigo_pedido_externo = v_pedido;

        return jsonb_build_object('id', v_id, 'codigo_rastreamento', v_codigo, 'duplicada', true);
      end if;

      if v_try >= 8 then
        raise exception 'Não foi possível gerar o código de rastreio. Tente novamente.' using errcode = 'P0001';
      end if;
    end;
  end loop;

  insert into public.item (entrega_id, descricao, quantidade, peso, valor_declarado)
  select v_id, btrim(x.descricao), x.quantidade, x.peso, x.valor_declarado
    from jsonb_to_recordset(p_itens) as x(descricao text, quantidade int, peso numeric, valor_declarado numeric);

  insert into public.historico_entrega (entrega_id, status_anterior, status_novo, observacao, usuario_id)
  values (v_id, null, 'solicitada', 'Entrega solicitada.', (select auth.uid()));

  return jsonb_build_object('id', v_id, 'codigo_rastreamento', v_codigo, 'duplicada', false);
end $$;


-- ---------- atualizar status ----------

create function public.avancar_status(p_entrega_id uuid, p_observacao text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  e public.entrega;
  v_prox public.status_entrega;
  v_obs text := nullif(btrim(coalesce(p_observacao, '')), '');
begin
  if v_obs is not null and length(v_obs) > 500 then
    raise exception 'A observação pode ter até 500 caracteres.' using errcode = 'P0001';
  end if;

  select * into e from public.entrega where id = p_entrega_id for update;

  if not found or not private.escopo(e.cliente_id, e.motorista_id) then
    raise exception 'Entrega não encontrada.' using errcode = 'P0001';
  end if;

  if e.status = 'entregue' then
    raise exception 'Esta entrega já foi concluída.' using errcode = 'P0001';
  end if;

  v_prox := private.proximo_permitido(e.status, e.motorista_id);

  if v_prox is null then
    raise exception 'Seu perfil não pode registrar o próximo status desta entrega.' using errcode = '42501';
  end if;

  if v_prox = 'saiu_cd' and e.motorista_id is null then
    raise exception 'Atribua um motorista antes de a carga sair do CD.' using errcode = 'P0001';
  end if;

  update public.entrega
     set status = v_prox,
         data_conclusao = case when v_prox = 'entregue' then now() else null end
   where id = e.id;

  insert into public.historico_entrega (entrega_id, status_anterior, status_novo, observacao, usuario_id)
  values (e.id, e.status, v_prox, v_obs, (select auth.uid()));

  perform private.recalcular_disponibilidade(e.motorista_id);

  return jsonb_build_object('status', v_prox, 'codigo_rastreamento', e.codigo_rastreamento);
end $$;


-- ---------- atribuir motorista ----------

create function public.atribuir_motorista(p_entrega_id uuid, p_motorista_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  e public.entrega;
  m public.motorista;
begin
  if coalesce(private.perfil(), '') not in ('admin', 'operador') then
    raise exception 'Você não tem permissão para atribuir motoristas.' using errcode = '42501';
  end if;

  select * into e from public.entrega where id = p_entrega_id for update;

  if not found then
    raise exception 'Entrega não encontrada.' using errcode = 'P0001';
  end if;

  if e.status = 'entregue' then
    raise exception 'Esta entrega já foi concluída.' using errcode = 'P0001';
  end if;

  if p_motorista_id is null then
    if e.status not in ('solicitada', 'coletada') then
      raise exception 'Depois que a carga sai do CD não dá para remover o motorista.' using errcode = 'P0001';
    end if;

    update public.entrega set motorista_id = null where id = e.id;
    return;
  end if;

  select * into m from public.motorista where id = p_motorista_id;

  if not found then
    raise exception 'Motorista não encontrado.' using errcode = 'P0001';
  end if;

  if m.disponibilidade = 'indisponivel' and e.motorista_id is distinct from m.id then
    raise exception 'Este motorista está indisponível.' using errcode = 'P0001';
  end if;

  update public.entrega set motorista_id = m.id where id = e.id;

  perform private.recalcular_disponibilidade(m.id);
  perform private.recalcular_disponibilidade(e.motorista_id);
end $$;


-- ---------- detalhe da entrega (já filtrado pelo perfil) ----------

create function public.detalhe_entrega(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e public.entrega;
  v_perfil text := private.perfil();
  v_staff boolean := coalesce(v_perfil, '') in ('admin', 'operador');
  v_doc text;
begin
  select * into e from public.entrega where codigo_rastreamento = upper(btrim(coalesce(p_codigo, '')));

  if not found or not private.escopo(e.cliente_id, e.motorista_id) then
    return null;
  end if;

  v_doc := case
    when e.documento_destinatario is null then null
    when v_perfil = 'cliente' then repeat('•', greatest(length(e.documento_destinatario) - 3, 0)) || right(e.documento_destinatario, 3)
    else e.documento_destinatario
  end;

  return jsonb_build_object(
    'entrega', jsonb_build_object(
      'id', e.id,
      'codigo_rastreamento', e.codigo_rastreamento,
      'codigo_pedido_externo', e.codigo_pedido_externo,
      'nome_destinatario', e.nome_destinatario,
      'documento_destinatario', v_doc,
      'endereco_origem', e.endereco_origem,
      'endereco_destino', e.endereco_destino,
      'data_solicitacao', e.data_solicitacao,
      'data_prevista', e.data_prevista,
      'data_conclusao', e.data_conclusao,
      'status', e.status
    ) || case when v_staff then jsonb_build_object(
      'valor_frete', e.valor_frete,
      'cliente', (select jsonb_build_object('id', c.id, 'nome', c.nome) from public.cliente c where c.id = e.cliente_id),
      'motorista', (select jsonb_build_object('id', m.id, 'nome', m.nome, 'telefone', m.telefone) from public.motorista m where m.id = e.motorista_id)
    ) else '{}'::jsonb end,
    'itens', (
      select coalesce(jsonb_agg(
        jsonb_build_object('descricao', i.descricao, 'quantidade', i.quantidade, 'peso', i.peso)
        || case when v_staff then jsonb_build_object('valor_declarado', i.valor_declarado) else '{}'::jsonb end
        order by i.descricao), '[]'::jsonb)
        from public.item i where i.entrega_id = e.id
    ),
    'historico', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'status_anterior', h.status_anterior,
        'status_novo', h.status_novo,
        'data_alteracao', h.data_alteracao,
        'observacao', h.observacao,
        'usuario', case when u.id is null then null else jsonb_build_object('nome', u.nome, 'perfil', u.perfil_acesso) end
      ) order by h.data_alteracao, h.id), '[]'::jsonb)
        from public.historico_entrega h left join public.usuario u on u.id = h.usuario_id
       where h.entrega_id = e.id
    ),
    'acoes', jsonb_build_object(
      'proximo_status', private.proximo_permitido(e.status, e.motorista_id),
      'pode_atribuir', v_staff and e.status <> 'entregue'
    )
  );
end $$;


-- ---------- rastreio público (sem login, sem dados pessoais) ----------

create function public.rastrear_publico(p_codigo text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  e public.entrega;
begin
  select * into e from public.entrega where codigo_rastreamento = upper(btrim(coalesce(p_codigo, '')));

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'codigo_rastreamento', e.codigo_rastreamento,
    'status', e.status,
    'data_prevista', e.data_prevista,
    'etapas', (
      select coalesce(jsonb_agg(jsonb_build_object('status', h.status_novo, 'data_alteracao', h.data_alteracao)
                                order by h.data_alteracao, h.id), '[]'::jsonb)
        from public.historico_entrega h where h.entrega_id = e.id
    )
  );
end $$;


-- ---------- painel ----------

create function public.painel() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_perfil text := private.perfil();
  v_staff boolean := coalesce(v_perfil, '') in ('admin', 'operador');
  v_hoje timestamptz := date_trunc('day', now() at time zone 'America/Sao_Paulo') at time zone 'America/Sao_Paulo';
begin
  if v_perfil is null or v_perfil = 'sistema' then
    raise exception 'Sem permissão.' using errcode = '42501';
  end if;

  return (
    with e as materialized (
      select * from public.entrega where private.escopo(cliente_id, motorista_id)
    )
    select jsonb_build_object(
      'total', count(*),
      'por_status', (select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
                       from (select status, count(*) n from e group by status) s),
      'em_andamento', count(*) filter (where status <> 'entregue'),
      'atrasadas', count(*) filter (where status <> 'entregue' and data_prevista < now()),
      'sem_motorista', case when v_staff then count(*) filter (where status <> 'entregue' and motorista_id is null) end,
      'concluidas_hoje', count(*) filter (where data_conclusao >= v_hoje),
      'pct_no_prazo', round(100.0 * count(*) filter (where status = 'entregue' and data_conclusao <= data_prevista)
                            / nullif(count(*) filter (where status = 'entregue'), 0)),
      'frete_total', case when v_perfil = 'admin' then coalesce(sum(valor_frete), 0) end,
      'motoristas', case when v_staff then
          (select coalesce(jsonb_object_agg(m.disponibilidade, m.n), '{}'::jsonb)
             from (select disponibilidade, count(*) n from public.motorista group by disponibilidade) m)
        end,
      'por_dia', (
        select jsonb_agg(jsonb_build_object('dia', d.dia, 'n', coalesce(c.n, 0)) order by d.dia)
          from (select g::date dia from generate_series((now() at time zone 'America/Sao_Paulo')::date - 6,
                                                         (now() at time zone 'America/Sao_Paulo')::date, interval '1 day') g) d
          left join (select (data_solicitacao at time zone 'America/Sao_Paulo')::date dia, count(*) n from e group by 1) c
            on c.dia = d.dia
      ),
      'atencao', (
        select coalesce(jsonb_agg(jsonb_build_object(
                 'codigo_rastreamento', a.codigo_rastreamento,
                 'nome_destinatario', a.nome_destinatario,
                 'endereco_destino', a.endereco_destino,
                 'status', a.status,
                 'data_prevista', a.data_prevista,
                 'atrasada', a.data_prevista < now(),
                 'sem_motorista', v_staff and a.motorista_id is null
               ) order by a.data_prevista), '[]'::jsonb)
          from (select * from e
                 where status <> 'entregue' and (data_prevista < now() or (v_staff and motorista_id is null))
                 order by data_prevista limit 8) a
      )
    ) from e
  );
end $$;


-- ---------- relatórios (admin) ----------

create function public.relatorio(p_inicio date, p_fim date) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if coalesce(private.perfil(), '') <> 'admin' then
    raise exception 'Somente o administrador acessa os relatórios.' using errcode = '42501';
  end if;

  if p_inicio is null or p_fim is null or p_fim < p_inicio or p_fim - p_inicio > 366 then
    raise exception 'Escolha um período válido (até 1 ano).' using errcode = 'P0001';
  end if;

  return (
    with e as materialized (
      select en.*, cl.nome as cliente_nome, mo.nome as motorista_nome
        from public.entrega en
        join public.cliente cl on cl.id = en.cliente_id
        left join public.motorista mo on mo.id = en.motorista_id
       where (en.data_solicitacao at time zone 'America/Sao_Paulo')::date between p_inicio and p_fim
    )
    select jsonb_build_object(
      'total', count(*),
      'entregues', count(*) filter (where status = 'entregue'),
      'frete_total', coalesce(sum(valor_frete), 0),
      'pct_no_prazo', round(100.0 * count(*) filter (where status = 'entregue' and data_conclusao <= data_prevista)
                            / nullif(count(*) filter (where status = 'entregue'), 0)),
      'tempo_medio_horas', round((avg(extract(epoch from data_conclusao - data_solicitacao) / 3600)
                                  filter (where status = 'entregue'))::numeric, 1),
      'por_status', (select coalesce(jsonb_object_agg(s.status, s.n), '{}'::jsonb)
                       from (select status, count(*) n from e group by status) s),
      'por_cliente', (select coalesce(jsonb_agg(jsonb_build_object('nome', t.nome, 'entregas', t.n, 'frete', t.f) order by t.n desc, t.nome), '[]'::jsonb)
                        from (select cliente_nome nome, count(*) n, sum(valor_frete) f from e group by 1) t),
      'por_motorista', (select coalesce(jsonb_agg(jsonb_build_object('nome', t.nome, 'entregas', t.n, 'entregues', t.ent, 'no_prazo', t.ok) order by t.n desc, t.nome), '[]'::jsonb)
                          from (select coalesce(motorista_nome, 'Sem motorista') nome, count(*) n,
                                       count(*) filter (where status = 'entregue') ent,
                                       count(*) filter (where status = 'entregue' and data_conclusao <= data_prevista) ok
                                  from e group by 1) t),
      'por_dia', (select coalesce(jsonb_agg(jsonb_build_object('dia', t.dia, 'entregas', t.n, 'frete', t.f) order by t.dia), '[]'::jsonb)
                    from (select (data_solicitacao at time zone 'America/Sao_Paulo')::date dia, count(*) n, sum(valor_frete) f from e group by 1) t),
      'linhas', (select coalesce(jsonb_agg(jsonb_build_object(
                    'codigo', l.codigo_rastreamento, 'pedido', l.codigo_pedido_externo, 'cliente', l.cliente_nome,
                    'motorista', l.motorista_nome, 'destinatario', l.nome_destinatario, 'origem', l.endereco_origem,
                    'destino', l.endereco_destino, 'status', l.status, 'solicitacao', l.data_solicitacao,
                    'prevista', l.data_prevista, 'conclusao', l.data_conclusao, 'frete', l.valor_frete
                  ) order by l.data_solicitacao desc), '[]'::jsonb)
                   from (select * from e order by data_solicitacao desc limit 5000) l)
    ) from e
  );
end $$;


-- ---------- integrações de API (admin e cliente dono) ----------

create function private.gerar_credencial(out chave text, out segredo text, out hash text)
language plpgsql set search_path = '' as $$
begin
  chave := 'kv_' || encode(extensions.gen_random_bytes(6), 'hex');
  segredo := 'ks_' || encode(extensions.gen_random_bytes(24), 'hex');
  hash := encode(extensions.digest(segredo, 'sha256'), 'hex');
end $$;

create function public.criar_integracao(p_cliente_id uuid, p_nome text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_perfil text := private.perfil();
  v_cliente uuid;
  v_nome text := btrim(coalesce(p_nome, ''));
  c record;
  v_id uuid;
begin
  if coalesce(v_perfil, '') not in ('admin', 'cliente') then
    raise exception 'Você não tem permissão para criar integrações.' using errcode = '42501';
  end if;

  v_cliente := case when v_perfil = 'cliente' then private.cliente_id() else p_cliente_id end;

  if v_cliente is null or not exists (select 1 from public.cliente where id = v_cliente) then
    raise exception 'Escolha o cliente da integração.' using errcode = 'P0001';
  end if;

  if v_nome = '' or length(v_nome) > 60 then
    raise exception 'Dê um nome à integração (até 60 caracteres).' using errcode = 'P0001';
  end if;

  if (select count(*) from public.integracao_api where cliente_id = v_cliente) >= 10 then
    raise exception 'Limite de 10 integrações por cliente.' using errcode = 'P0001';
  end if;

  select * into c from private.gerar_credencial();

  insert into public.integracao_api (cliente_id, nome, chave_identificacao, segredo)
  values (v_cliente, v_nome, c.chave, c.hash) returning id into v_id;

  return jsonb_build_object('id', v_id, 'nome', v_nome, 'chave_identificacao', c.chave, 'segredo', c.segredo);
end $$;

create function public.gerar_novo_segredo(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  i public.integracao_api;
  c record;
begin
  select * into i from public.integracao_api where id = p_id for update;

  if not found or not (private.perfil() = 'admin' or i.cliente_id = private.cliente_id()) then
    raise exception 'Integração não encontrada.' using errcode = 'P0001';
  end if;

  select * into c from private.gerar_credencial();

  update public.integracao_api set segredo = c.hash where id = i.id;

  return jsonb_build_object('id', i.id, 'nome', i.nome, 'chave_identificacao', i.chave_identificacao, 'segredo', c.segredo);
end $$;

create function public.alterar_status_integracao(p_id uuid, p_status public.status_integracao) returns void
language plpgsql security definer set search_path = '' as $$
declare
  i public.integracao_api;
begin
  select * into i from public.integracao_api where id = p_id for update;

  if not found or not (private.perfil() = 'admin' or i.cliente_id = private.cliente_id()) then
    raise exception 'Integração não encontrada.' using errcode = 'P0001';
  end if;

  update public.integracao_api set status = p_status where id = i.id;
end $$;


-- ============================================================================
-- 5. SEGURANÇA: RLS por perfil e permissões mínimas
--    Escritas de negócio só pelas funções acima; valor_frete, documento_destinatario e o hash do segredo
--    nunca são lidos diretamente pelo front.
-- ============================================================================

-- nada para o público (anon), exceto o rastreio
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from public, anon;
revoke all on all tables in schema public from authenticated;

-- quem está logado
grant select on public.usuario to authenticated;
grant update (nome) on public.usuario to authenticated;

grant select, insert, update, delete on public.cliente to authenticated;
grant select, insert, update, delete on public.motorista to authenticated;

grant select (id, cliente_id, motorista_id, codigo_pedido_externo, codigo_rastreamento, nome_destinatario,
              endereco_origem, endereco_destino, data_solicitacao, data_prevista, data_conclusao, status)
  on public.entrega to authenticated;
grant select (id, entrega_id, descricao, quantidade, peso) on public.item to authenticated;
grant select on public.historico_entrega to authenticated;

grant select (id, cliente_id, nome, chave_identificacao, status, data_criacao, data_ultima_utilizacao)
  on public.integracao_api to authenticated;

grant execute on function
  public.criar_entrega(uuid, text, text, text, text, text, timestamptz, jsonb),
  public.avancar_status(uuid, text),
  public.atribuir_motorista(uuid, uuid),
  public.detalhe_entrega(text),
  public.painel(),
  public.relatorio(date, date),
  public.criar_integracao(uuid, text),
  public.gerar_novo_segredo(uuid),
  public.alterar_status_integracao(uuid, public.status_integracao)
  to authenticated;

grant execute on function public.rastrear_publico(text) to anon, authenticated;

-- ---------- políticas ----------

create policy usuario_ler on public.usuario for select to authenticated
  using (id = (select auth.uid()) or (select private.perfil()) = 'admin');
create policy usuario_editar_proprio on public.usuario for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy cliente_ler on public.cliente for select to authenticated
  using ((select private.perfil()) in ('admin', 'operador') or usuario_id = (select auth.uid()));
create policy cliente_criar on public.cliente for insert to authenticated
  with check ((select private.perfil()) = 'admin');
create policy cliente_editar on public.cliente for update to authenticated
  using ((select private.perfil()) = 'admin') with check ((select private.perfil()) = 'admin');
create policy cliente_excluir on public.cliente for delete to authenticated
  using ((select private.perfil()) = 'admin');

create policy motorista_ler on public.motorista for select to authenticated
  using ((select private.perfil()) in ('admin', 'operador') or usuario_id = (select auth.uid()));
create policy motorista_criar on public.motorista for insert to authenticated
  with check ((select private.perfil()) = 'admin');
create policy motorista_editar on public.motorista for update to authenticated
  using ((select private.perfil()) = 'admin' or usuario_id = (select auth.uid()))
  with check ((select private.perfil()) = 'admin' or usuario_id = (select auth.uid()));
create policy motorista_excluir on public.motorista for delete to authenticated
  using ((select private.perfil()) = 'admin');

create policy entrega_ler on public.entrega for select to authenticated
  using (private.escopo(cliente_id, motorista_id));
create policy item_ler on public.item for select to authenticated
  using (exists (select 1 from public.entrega e where e.id = item.entrega_id));
create policy historico_ler on public.historico_entrega for select to authenticated
  using (exists (select 1 from public.entrega e where e.id = historico_entrega.entrega_id));

create policy integracao_ler on public.integracao_api for select to authenticated
  using ((select private.perfil()) = 'admin' or cliente_id = (select private.cliente_id()));


-- ============================================================================
-- 6. FUNÇÕES DA API NODE DE INTEGRAÇÃO (autenticam pelo token "chave.segredo")
--    O segredo tem 192 bits e só o hash SHA-256 fica no banco; assim a API usa só a chave pública do projeto.
-- ============================================================================

create function private.autenticar_api(p_token text, out o_cliente uuid, out o_nome text)
language plpgsql security definer set search_path = '' as $$
declare
  v_chave text;
  v_seg text;
  i public.integracao_api;
begin
  if p_token is null or length(p_token) > 200 or position('.' in p_token) = 0 then
    return;
  end if;

  v_chave := split_part(p_token, '.', 1);
  v_seg := substr(p_token, position('.' in p_token) + 1);

  select * into i from public.integracao_api where chave_identificacao = v_chave and status = 'ativa';

  if not found or i.segredo <> encode(extensions.digest(v_seg, 'sha256'), 'hex') then
    return;
  end if;

  if i.data_ultima_utilizacao is null or i.data_ultima_utilizacao < now() - interval '1 minute' then
    update public.integracao_api set data_ultima_utilizacao = now() where id = i.id;
  end if;

  o_cliente := i.cliente_id;
  select c.nome into o_nome from public.cliente c where c.id = i.cliente_id;
end $$;

create function public.api_autenticar(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare a record;
begin
  select * into a from private.autenticar_api(p_token);

  if a.o_cliente is null then
    return null;
  end if;

  return jsonb_build_object('id', a.o_cliente, 'nome', a.o_nome);
end $$;

-- cria entrega + itens + 1º histórico de forma atômica; violações de unicidade sobem como erro 23505
create function public.api_criar_entrega(
  p_token text, p_codigo text, p_pedido text, p_destinatario text, p_origem text, p_destino text,
  p_prevista timestamptz, p_itens jsonb
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  a record;
  v_id uuid;
  v_peso numeric;
begin
  select * into a from private.autenticar_api(p_token);

  if a.o_cliente is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  select coalesce(sum(x.peso), 0) into v_peso
    from jsonb_to_recordset(p_itens) as x(descricao text, quantidade int, peso numeric);

  insert into public.entrega (cliente_id, codigo_pedido_externo, codigo_rastreamento, nome_destinatario,
                              endereco_origem, endereco_destino, data_prevista, valor_frete)
  values (a.o_cliente, btrim(p_pedido), p_codigo, btrim(p_destinatario), btrim(p_origem), btrim(p_destino),
          p_prevista, round(25 + 2.8 * v_peso, 2))
  returning id into v_id;

  insert into public.item (entrega_id, descricao, quantidade, peso)
  select v_id, btrim(x.descricao), x.quantidade, x.peso
    from jsonb_to_recordset(p_itens) as x(descricao text, quantidade int, peso numeric);

  insert into public.historico_entrega (entrega_id, status_anterior, status_novo, observacao, usuario_id)
  values (v_id, null, 'solicitada', 'Pedido ' || btrim(p_pedido) || ' recebido pela integração da ' || a.o_nome || '.',
          (select u.id from public.usuario u where u.perfil_acesso = 'sistema' limit 1));
end $$;

-- { entrega, itens, historico } da própria loja, por código de rastreio ou por pedido; nulo se não achar
create function public.api_detalhe_entrega(p_token text, p_codigo text default null, p_pedido text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
  e public.entrega;
begin
  select * into a from private.autenticar_api(p_token);

  if a.o_cliente is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  select * into e from public.entrega
   where cliente_id = a.o_cliente
     and ((p_codigo is not null and codigo_rastreamento = p_codigo) or (p_pedido is not null and codigo_pedido_externo = p_pedido))
   limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'entrega', jsonb_build_object(
      'codigo_rastreamento', e.codigo_rastreamento, 'codigo_pedido_externo', e.codigo_pedido_externo,
      'nome_destinatario', e.nome_destinatario, 'endereco_origem', e.endereco_origem,
      'endereco_destino', e.endereco_destino, 'data_solicitacao', e.data_solicitacao,
      'data_prevista', e.data_prevista, 'data_conclusao', e.data_conclusao, 'status', e.status),
    'itens', (select coalesce(jsonb_agg(jsonb_build_object('descricao', i.descricao, 'quantidade', i.quantidade, 'peso', i.peso)
                                         order by i.descricao), '[]'::jsonb) from public.item i where i.entrega_id = e.id),
    'historico', (select coalesce(jsonb_agg(jsonb_build_object(
                    'status_anterior', h.status_anterior, 'status_novo', h.status_novo, 'data_alteracao', h.data_alteracao,
                    'observacao', h.observacao,
                    'usuario', case when u.id is null then null else jsonb_build_object('nome', u.nome, 'perfil', u.perfil_acesso) end
                  ) order by h.data_alteracao, h.id), '[]'::jsonb)
                    from public.historico_entrega h left join public.usuario u on u.id = h.usuario_id where h.entrega_id = e.id)
  );
end $$;

-- lista paginada (mais recentes primeiro) das entregas da loja
create function public.api_listar_entregas(p_token text, p_pedido text, p_status text, p_limite int, p_offset int) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  a record;
begin
  select * into a from private.autenticar_api(p_token);

  if a.o_cliente is null then
    raise exception 'nao_autenticado' using errcode = '28000';
  end if;

  return (
    with f as (
      select * from public.entrega e
       where e.cliente_id = a.o_cliente
         and (p_pedido is null or e.codigo_pedido_externo = p_pedido)
         and (p_status is null or e.status::text = p_status)
    )
    select jsonb_build_object(
      'total', (select count(*) from f),
      'linhas', (select coalesce(jsonb_agg(jsonb_build_object(
                   'codigo_rastreamento', x.codigo_rastreamento, 'codigo_pedido_externo', x.codigo_pedido_externo,
                   'nome_destinatario', x.nome_destinatario, 'endereco_origem', x.endereco_origem,
                   'endereco_destino', x.endereco_destino, 'data_solicitacao', x.data_solicitacao,
                   'data_prevista', x.data_prevista, 'data_conclusao', x.data_conclusao, 'status', x.status
                 ) order by x.data_solicitacao desc, x.id), '[]'::jsonb)
                   from (select * from f order by data_solicitacao desc, id limit greatest(p_limite, 1) offset greatest(p_offset, 0)) x)
    )
  );
end $$;

revoke all on function public.api_autenticar(text), public.api_criar_entrega(text, text, text, text, text, text, timestamptz, jsonb),
  public.api_detalhe_entrega(text, text, text), public.api_listar_entregas(text, text, text, int, int) from public, authenticated;
grant execute on function public.api_autenticar(text), public.api_criar_entrega(text, text, text, text, text, text, timestamptz, jsonb),
  public.api_detalhe_entrega(text, text, text), public.api_listar_entregas(text, text, text, int, int) to anon;
