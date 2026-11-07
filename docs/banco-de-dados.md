# Banco de dados — Korven (Supabase / PostgreSQL)

Projeto Supabase PostgreSQL. Tudo o que o banco precisa está em dois arquivos de `supabase/`: **`schema.sql`**
(tipos, tabelas, funções, RLS e permissões) e **`seed.sql`** (dados de demonstração, opcional).

## Criar o banco do zero (quem clonar o repositório)

1. Crie um projeto em [supabase.com](https://supabase.com) (região mais próxima de você).
2. **SQL Editor** → cole todo o `supabase/schema.sql` e rode **uma vez**.
3. (Opcional) Edite a senha na primeira linha útil de `supabase/seed.sql` (`v_senha`) e rode o arquivo. Ele cria as
   contas de demonstração (`admin@korven.demo`, `operador@`, `carlos@`, `juliana@`, `anderson@`, `sergio@` e
   `lojaverde@korven.demo`), 4 clientes, 4 motoristas e 16 entregas. Só roda em banco sem usuários.
4. **Edge Function** (criar logins pelo sistema): instale a [CLI do Supabase](https://supabase.com/docs/guides/cli) e
   rode `supabase functions deploy gerenciar-usuarios --project-ref SEU_REF` na raiz do projeto. Sem ela, só a tela
   "Usuários" e a opção "criar acesso" em Clientes e Motoristas deixam de funcionar.
5. **Ligue o front ao seu projeto**: em **Project Settings → API**, copie a *Project URL* e a chave *anon*
   (ou *publishable*) e troque nos três lugares onde ficam: `sistema/assets/js/core/config.js`, `rastreio.js` e
   `api/.env` (`SUPABASE_URL` e `SUPABASE_ANON_KEY`, a partir de `api/.env.example`). Não use a chave `service_role`.
6. **Authentication** (painel do Supabase):
   - Sign In / Providers → **User Signups** → desligue *Allow new users to sign up* (os acessos são criados pelo admin).
     Mantenha o provedor Email ligado.
   - URL Configuration → Site URL e Redirect URLs com o endereço em que o sistema for publicado, para o link de
     "esqueci a senha".
   - (Planos pagos) Password security → proteção contra senhas vazadas.

Sem o seed, crie o primeiro administrador em **Authentication → Users → Add user** (marque *Auto Confirm User*) e rode:

```sql
insert into public.usuario (id, nome, perfil_acesso)
select id, 'Seu Nome', 'admin' from auth.users where email = 'seu@email.com';
```

## Tabelas

| Tabela | Observações |
|---|---|
| `usuario` | `id` = `auth.users.id`; `perfil_acesso` (admin, operador, motorista, cliente, sistema) |
| `cliente` | `usuario_id` opcional e único (login do cliente); `cpf_cnpj` único |
| `motorista` | `usuario_id` opcional e único; `cpf` e `cnh` únicos; `disponibilidade` |
| `entrega` | `codigo_rastreamento` único; `(cliente_id, codigo_pedido_externo)` único; `data_conclusao` só quando `entregue` |
| `item` | pertence à entrega (apaga junto); quantidade > 0, peso ≥ 0 |
| `historico_entrega` | `status_anterior` nulo no 1º registro; quem registrou em `usuario_id` |
| `integracao_api` | `segredo` guarda **só o hash SHA-256**; `chave_identificacao` única |

## Quem faz o quê (segurança)

O front usa a chave pública (anon) e o login do Supabase Auth. A proteção real está no banco:

- **RLS** em todas as tabelas, por perfil: admin/operador veem tudo; cliente só as próprias entregas; motorista só as
  atribuídas a ele; `usuario` só a própria linha (admin vê todas).
- **Colunas sensíveis** (`entrega.valor_frete`, `entrega.documento_destinatario`, `integracao_api.segredo`) não têm
  `SELECT` para o front. Saem apenas pelas funções abaixo, já filtradas pelo perfil (o cliente não vê frete e vê o
  documento mascarado).
- **Escritas de negócio** em `entrega`, `item` e `historico_entrega` só acontecem pelas funções (nenhuma política de
  `INSERT/UPDATE` para o front). Cada função confere o perfil de quem chama.
- `motorista`: o próprio motorista só altera telefone e disponibilidade (trigger `motorista_guard`).

## Funções (RPC)

| Função | Quem chama | O que faz |
|---|---|---|
| `criar_entrega(...)` | cliente, operador, admin | valida, gera `KV-NNNNNN`, calcula o frete (R$ 25 + R$ 2,80/kg), grava itens e 1º histórico; pedido repetido devolve a entrega existente |
| `avancar_status(id, obs)` | operador (`coletada`, `saiu_cd`), motorista (demais, só as dele), admin | só avança 1 etapa; `saiu_cd` exige motorista; grava histórico e `data_conclusao`; ajusta a disponibilidade do motorista |
| `atribuir_motorista(id, motorista)` | operador, admin | só em entrega não concluída; recusa motorista indisponível |
| `detalhe_entrega(codigo)` | todos (escopo do perfil) | `{ entrega, itens, historico, acoes }` filtrado pelo perfil |
| `painel()` | admin, operador, cliente, motorista | números e listas do painel no escopo do perfil |
| `relatorio(inicio, fim)` | admin | totais, por dia/status/cliente/motorista e linhas para CSV |
| `criar_integracao`, `gerar_novo_segredo`, `alterar_status_integracao` | admin, cliente (as dele) | o segredo em texto puro é devolvido uma única vez |
| `rastrear_publico(codigo)` | público (anon) | só status e datas das etapas, sem nomes, endereços ou valores |
| `api_autenticar`, `api_criar_entrega`, `api_detalhe_entrega`, `api_listar_entregas` | API Node (anon + token da loja) | cada uma confere o token `chave.segredo` (hash SHA-256) e só enxerga as entregas da loja |

## Edge Function `gerenciar-usuarios`

Código em `supabase/functions/gerenciar-usuarios/`. Só o admin pode usar (confere o perfil no banco). Faz o que exige a
chave de serviço: listar usuários com e-mail, criar login (vinculando a cliente ou motorista), atualizar nome/perfil
(sem remover o último admin) e redefinir senha.

## Dados de demonstração e acessos

O `seed.sql` cria as contas de demonstração (admin, operador, 4 motoristas e o cliente LojaVerde) com a senha que você
definir em `v_senha`. O usuário `sistema` ("Integração Korven") é bloqueado para login e serve ao histórico das entregas
criadas pela API. Troque as senhas antes de usar com dados reais.
