# Banco de dados — Korven (Supabase / PostgreSQL)

Projeto **Korven** na organização Dirt Second (`sarkvqgxnwvrslawtwuy`, região us-east-1). Os scripts aplicados ficam no
próprio projeto (Dashboard → Database → Migrations): `estrutura_entregas_itens_historico_integracao`,
`regras_de_negocio_funcoes`, `seguranca_rls_e_permissoes` e `funcoes_da_api_de_integracao_por_token`. As tabelas `usuario`, `cliente` e `motorista` já existiam.

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

O banco foi populado com 4 clientes, 4 motoristas e 16 entregas em vários status. Contas de demonstração (admin,
operador, 4 motoristas e o cliente LojaVerde) e a senha ficam em `sistema/docs/acessos-demo.txt`, que **não vai para o
git**. Troque as senhas antes de usar com dados reais. O usuário `sistema` ("Integração Korven") é bloqueado para login e
serve ao histórico das entregas criadas pela API.

## Pendências de configuração (painel do Supabase)

- Authentication → Providers → Email: desligar **Allow new users to sign up** (os acessos são criados pelo admin).
- Authentication → URL Configuration: incluir a URL em que o sistema for publicado, para o link de "esqueci a senha".
- Authentication → Password security: ligar a proteção contra senhas vazadas (aviso do advisor).
