-- ============================================================================
-- KORVEN · dados de demonstração (opcional)
--
-- Rode DEPOIS de supabase/schema.sql, uma única vez, em um projeto novo.
-- Cria 8 usuários de login, 4 clientes, 4 motoristas, 16 entregas em vários status e 1 integração de exemplo.
--
-- ATENÇÃO: todas as contas usam a senha definida em "v_senha" logo abaixo. Troque o valor ANTES de rodar
-- e, de preferência, troque as senhas pelo sistema depois (Usuários > Redefinir senha).
--
-- Contas criadas (e-mail / perfil):
--   admin@korven.demo      admin            lojaverde@korven.demo  cliente (LojaVerde)
--   operador@korven.demo   operador         carlos@korven.demo     motorista
--   juliana@korven.demo    motorista        anderson@korven.demo   motorista
--   sergio@korven.demo     motorista        (sistema@korven.invalid = usuário "sistema", sem login)
-- ============================================================================

do $seed$
declare
  v_senha constant text := 'TroqueEstaSenha!2026';

  u record;
  c record;
  v_id uuid;
  v_op uuid;
  v_sis uuid;
  v_cli_user uuid;
  v_ent uuid;
  v_cid uuid;
  v_mid uuid;
  v_t0 timestamptz;
  v_prev timestamptz;
  v_peso numeric;
  v_frete numeric;
  i int;
  v_cli uuid[];
  v_mot uuid[];
  v_off numeric[] := array[0, 2.2, 4.4, 15, 27, 30, 33.5];
  v_st public.status_entrega[] := enum_range(null::public.status_entrega);
  v_obs text[] := array['Entrega solicitada.', 'Coleta confirmada no endereço de origem.', 'Carga conferida e despachada do centro de distribuição.',
                        'Carga em trânsito pela rodovia.', 'Chegou à cidade de destino.', 'Saiu para entrega ao destinatário.', 'Entregue ao destinatário.'];
begin
  if exists (select 1 from public.usuario) then
    raise exception 'O seed só roda em um banco sem usuários.';
  end if;

  -- usuários de login + usuário "sistema" (sem login)
  for u in select * from (values
    ('admin@korven.demo', 'Administrador Korven', 'admin'),
    ('operador@korven.demo', 'Bruno Lima', 'operador'),
    ('carlos@korven.demo', 'Carlos Mendes', 'motorista'),
    ('juliana@korven.demo', 'Juliana Prado', 'motorista'),
    ('anderson@korven.demo', 'Anderson Teles', 'motorista'),
    ('sergio@korven.demo', 'Sérgio Nunes', 'motorista'),
    ('lojaverde@korven.demo', 'LojaVerde', 'cliente'),
    ('sistema@korven.invalid', 'Integração Korven', 'sistema')
  ) t(email, nome, perfil) loop
    v_id := gen_random_uuid();

    insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change_token_new, email_change, banned_until)
    values ('00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
            case when u.perfil = 'sistema' then '' else extensions.crypt(v_senha, extensions.gen_salt('bf')) end, now(),
            '{"provider":"email","providers":["email"]}', '{}', now(), now(), '', '', '', '',
            case when u.perfil = 'sistema' then now() + interval '100 years' end);

    insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_id, v_id::text,
            jsonb_build_object('sub', v_id, 'email', u.email, 'email_verified', true, 'phone_verified', false), 'email', now(), now(), now());

    insert into public.usuario (id, nome, perfil_acesso) values (v_id, u.nome, u.perfil);

    if u.perfil = 'operador' then v_op := v_id; end if;
    if u.perfil = 'sistema' then v_sis := v_id; end if;
    if u.perfil = 'cliente' then v_cli_user := v_id; end if;
  end loop;

  -- clientes (LojaVerde tem login)
  insert into public.cliente (usuario_id, nome, cpf_cnpj, email, telefone, endereco) values
    (v_cli_user, 'LojaVerde', '12.345.678/0001-90', 'contato@lojaverde.example', '(51) 3333-1020', 'Av. Ipiranga, 1200 · Porto Alegre/RS'),
    (null, 'Mundo Tech', '23.456.789/0001-01', 'logistica@mundotech.example', '(41) 3030-4455', 'R. XV de Novembro, 840 · Curitiba/PR'),
    (null, 'Farmácia Central', '34.567.890/0001-12', 'compras@farmaciacentral.example', '(19) 3232-7788', 'Av. Norte-Sul, 305 · Campinas/SP'),
    (null, 'Atelier Rota', '45.678.901/0001-23', 'oi@atelierrota.example', '(48) 3224-9090', 'R. Felipe Schmidt, 77 · Florianópolis/SC');

  -- motoristas, ligados ao login pelo e-mail
  insert into public.motorista (usuario_id, nome, cpf, cnh, telefone, email)
  select (select au.id from auth.users au where au.email = m.email), m.nome, m.cpf, m.cnh, m.tel, m.email
    from (values
      ('Carlos Mendes', '111.222.333-44', '04412345601', '(51) 99111-2020', 'carlos@korven.demo'),
      ('Juliana Prado', '222.333.444-55', '04412345602', '(41) 99222-3131', 'juliana@korven.demo'),
      ('Anderson Teles', '333.444.555-66', '04412345603', '(19) 99333-4242', 'anderson@korven.demo'),
      ('Sérgio Nunes', '444.555.666-77', '04412345604', '(48) 99444-5353', 'sergio@korven.demo')
    ) m(nome, cpf, cnh, tel, email);

  -- índices 1..4 na ordem LojaVerde, Mundo Tech, Farmácia Central, Atelier Rota e Carlos, Juliana, Anderson, Sérgio
  select array_agg(x.id order by x.ord) into v_cli
    from (select id, case nome when 'LojaVerde' then 1 when 'Mundo Tech' then 2 when 'Farmácia Central' then 3 else 4 end ord from public.cliente) x;
  select array_agg(x.id order by x.ord) into v_mot
    from (select id, case nome when 'Carlos Mendes' then 1 when 'Juliana Prado' then 2 when 'Anderson Teles' then 3 else 4 end ord from public.motorista) x;

  -- entregas: código, pedido, destinatário, documento, origem, destino, cliente (1-4), motorista (0 = nenhum),
  --           etapa atual (0-6), horas desde a solicitação, prazo em horas, itens
  for c in select * from (values
    ('KV-48213', 'LV-90417', 'Marina Souza Almeida', '111.222.333-44', 'Porto Alegre/RS', 'São Paulo/SP', 1, 1, 3, 15.7, 11, '[{"descricao":"Notebook 14\"","quantidade":2,"peso":4.8},{"descricao":"Monitor 27\"","quantidade":3,"peso":21},{"descricao":"Kit de periféricos","quantidade":12,"peso":116}]'),
    ('KV-51980', 'MT-22871', 'Rafael Bittencourt', '222.333.444-55', 'Curitiba/PR', 'Belo Horizonte/MG', 2, 2, 5, 30.4, -0.5, '[{"descricao":"Roteador Wi-Fi 6","quantidade":8,"peso":9.6},{"descricao":"Switch 24 portas","quantidade":2,"peso":7.4}]'),
    ('KV-30456', 'FC-00918', 'Helena Duarte Lima', '333.444.555-66', 'Campinas/SP', 'Recife/PE', 3, 3, 1, 3.3, 52, '[{"descricao":"Caixa térmica (insumos)","quantidade":6,"peso":38},{"descricao":"Material de curativo","quantidade":14,"peso":22}]'),
    ('KV-77102', 'AR-51302', 'Otávio Pimentel', '444.555.666-77', 'Florianópolis/SC', 'Goiânia/GO', 4, 4, 6, 36, 2, '[{"descricao":"Mesa de escritório","quantidade":4,"peso":96},{"descricao":"Cadeira ergonômica","quantidade":4,"peso":52}]'),
    ('KV-60214', 'LV-90418', 'Paulo Henrique Matos', '555.666.777-88', 'Porto Alegre/RS', 'Salvador/BA', 1, 0, 0, 1.5, 90, '[{"descricao":"Tênis esportivo","quantidade":2,"peso":2.4},{"descricao":"Mochila 30L","quantidade":1,"peso":1.1}]'),
    ('KV-60215', 'LV-90419', 'Camila Ferraz', '666.777.888-99', 'Porto Alegre/RS', 'Curitiba/PR', 1, 0, 1, 6, 20, '[{"descricao":"Cafeteira elétrica","quantidade":1,"peso":3.2}]'),
    ('KV-62001', 'MT-22880', 'Luciana Andrade', '777.888.999-00', 'Curitiba/PR', 'Rio de Janeiro/RJ', 2, 1, 2, 8, 30, '[{"descricao":"Tablet 10\"","quantidade":5,"peso":3.5},{"descricao":"Capa protetora","quantidade":5,"peso":0.9}]'),
    ('KV-62002', 'MT-22881', 'Bruno Tavares', '888.999.000-11', 'Curitiba/PR', 'Brasília/DF', 2, 2, 4, 30, 3, '[{"descricao":"Impressora multifuncional","quantidade":3,"peso":21}]'),
    ('KV-63110', 'FC-00920', 'Fábio Nogueira', '999.000.111-22', 'Campinas/SP', 'Fortaleza/CE', 3, 3, 3, 20, -6, '[{"descricao":"Caixa térmica (vacinas)","quantidade":4,"peso":26}]'),
    ('KV-63111', 'FC-00921', 'Sandra Meireles', '000.111.222-33', 'Campinas/SP', 'Vitória/ES', 3, 0, 0, 0.8, -2, '[{"descricao":"Material hospitalar","quantidade":9,"peso":31}]'),
    ('KV-71200', 'AR-51310', 'Tiago Rezende', '121.232.343-54', 'Florianópolis/SC', 'Porto Alegre/RS', 4, 4, 6, 60, 4, '[{"descricao":"Quadro decorativo","quantidade":6,"peso":18}]'),
    ('KV-71201', 'AR-51311', 'Ana Beatriz Cunha', '343.454.565-76', 'Florianópolis/SC', 'Campinas/SP', 4, 1, 6, 70, -5, '[{"descricao":"Poltrona","quantidade":2,"peso":44}]'),
    ('KV-48214', 'LV-90301', 'Eduardo Salles', '565.676.787-98', 'Porto Alegre/RS', 'Recife/PE', 1, 2, 6, 90, 6, '[{"descricao":"Smart TV 50\"","quantidade":2,"peso":34}]'),
    ('KV-48215', 'LV-90302', 'Fernanda Lopes', '787.898.909-10', 'Porto Alegre/RS', 'Belém/PA', 1, 3, 6, 120, 3, '[{"descricao":"Fogão 5 bocas","quantidade":1,"peso":38}]'),
    ('KV-52011', 'MT-22790', 'Gustavo Pires', '909.010.121-32', 'Curitiba/PR', 'São Paulo/SP', 2, 4, 6, 50, 10, '[{"descricao":"Servidor rack 1U","quantidade":1,"peso":14},{"descricao":"Nobreak 1500VA","quantidade":2,"peso":30}]'),
    ('KV-52012', 'MT-22791', 'Isabela Rocha', '232.343.454-65', 'Curitiba/PR', 'Florianópolis/SC', 2, 1, 5, 31, 1.5, '[{"descricao":"Kit câmeras de segurança","quantidade":4,"peso":8.8}]')
  ) t(codigo, pedido, dest, doc, orig, dst, cli, mot, atual, horas, prazo, itens) loop
    v_cid := v_cli[c.cli];
    v_mid := case when c.mot = 0 then null else v_mot[c.mot] end;
    v_t0 := now() - (c.horas || ' hours')::interval;

    select coalesce(sum((x->>'peso')::numeric), 0) into v_peso from jsonb_array_elements(c.itens::jsonb) x;
    v_frete := round(25 + 2.8 * v_peso, 2);
    v_prev := case when c.atual = 6 then v_t0 + (v_off[7] || ' hours')::interval + (c.prazo || ' hours')::interval
                   else now() + (c.prazo || ' hours')::interval end;

    insert into public.entrega (cliente_id, motorista_id, codigo_pedido_externo, codigo_rastreamento, nome_destinatario, documento_destinatario,
                                endereco_origem, endereco_destino, data_solicitacao, data_prevista, data_conclusao, status, valor_frete)
    values (v_cid, v_mid, c.pedido, c.codigo, c.dest, c.doc, c.orig, c.dst, v_t0, v_prev,
            case when c.atual = 6 then v_t0 + (v_off[7] || ' hours')::interval end, v_st[c.atual + 1], v_frete)
    returning id into v_ent;

    insert into public.item (entrega_id, descricao, quantidade, peso)
    select v_ent, x->>'descricao', (x->>'quantidade')::int, (x->>'peso')::numeric from jsonb_array_elements(c.itens::jsonb) x;

    for i in 0 .. c.atual loop
      insert into public.historico_entrega (entrega_id, status_anterior, status_novo, data_alteracao, observacao, usuario_id)
      values (v_ent, case when i = 0 then null else v_st[i] end, v_st[i + 1], v_t0 + (v_off[i + 1] || ' hours')::interval, v_obs[i + 1],
              case when i = 0 and c.cli in (1, 2) then v_sis
                   when i <= 2 then v_op
                   else (select m.usuario_id from public.motorista m where m.id = v_mid) end);
    end loop;
  end loop;

  for i in 1 .. 4 loop
    perform private.recalcular_disponibilidade(v_mot[i]);
  end loop;

  update public.motorista set disponibilidade = 'indisponivel' where nome = 'Sérgio Nunes';

  -- integração de exemplo da LojaVerde (o segredo em texto puro não é guardado em lugar nenhum)
  insert into public.integracao_api (cliente_id, nome, chave_identificacao, segredo, data_ultima_utilizacao)
  values (v_cli[1], 'Loja online', 'kv_demo0000001', encode(extensions.digest('segredo-de-demonstracao', 'sha256'), 'hex'), now() - interval '2 hours');
end $seed$;
