# Sistema Korven — Telas e acessos

Guia para o front-end do sistema interno: o que cada tela faz, quem acessa e quais dados usa (`tabela.campo`).
**L** = só leitura · **E** = grava · ✅ já feita.

## Perfis

| Perfil | Papel |
|---|---|
| **admin** | gestão; vê tudo e é o único que cria clientes, motoristas e usuários |
| **operador** | operação; cria entregas, atribui motorista, registra `coletada` e `saiu_cd`; só consulta clientes e motoristas |
| **motorista** | vê só as entregas atribuídas a ele; registra os status de rota e entrega |
| **cliente** | loja com login (`cliente.usuario_id`); vê só as próprias entregas, sem valor de frete |
| **público** | só o rastreio por código |

O login é feito pelo Supabase Auth; o perfil vem de `usuario.perfil_acesso`. O front esconde o que o perfil não pode ver,
mas a proteção de verdade é do banco (RLS).

## Matriz de telas

| Tela | Público | Cliente | Motorista | Operador | Admin |
|---|:--:|:--:|:--:|:--:|:--:|
| Login | ● | ● | ● | ● | ● |
| Rastreio público | ● | | | | |
| Painel | | ● | | ● | ● |
| Entregas — lista | | ● (as dele) | ● (as dele) | ● | ● |
| Entrega — detalhe e histórico ✅ | | ● | ● | ● | ● |
| Nova entrega | | ● | | ● | ● |
| Atualizar status | | | ● | ● | ● |
| Atribuir motorista | | | | ● | ● |
| Clientes | | | | ● (só leitura) | ● (cria e edita) |
| Motoristas | | | | ● (só leitura) | ● (cria e edita) |
| Usuários | | | | | ● |
| Integrações de API | | ● (as dele) | | | ● |
| Relatórios | | | | | ● |
| Meu perfil | | ● | ● | ● | ● |

**Menu:** admin = Painel · Entregas · Clientes · Motoristas · Integrações · Usuários · Relatórios ·
operador = Painel · Entregas · Clientes · Motoristas · motorista = Minhas entregas · Meu perfil ·
cliente = Painel · Entregas · Integração.

## Status (ENUM) e quem registra

`solicitada` → `coletada` → `saiu_cd` → `em_rodovia` → `na_cidade` → `saiu_entrega` → `entregue`

| Status | Quem registra |
|---|---|
| `solicitada` | sistema (API) ou operador |
| `coletada`, `saiu_cd` | operador |
| `em_rodovia`, `na_cidade`, `saiu_entrega`, `entregue` | motorista |
| correção de qualquer um | admin |

Só avança para o próximo. Cada mudança grava em `historico_entrega`; ao entregar, preenche `entrega.data_conclusao`.

---

## Telas

### Login — todos
- Entrar com e-mail e senha (Supabase Auth), sair, recuperar senha.
- Depois do login: admin/operador → Painel · motorista → Minhas entregas · cliente → Painel.

### Rastreio público — público ✅ (na landing)
- **Entrada:** `entrega.codigo_rastreamento`.
- **Mostra:** status atual e etapas com data. Sem endereços, nomes, documentos ou valores.

### Painel — admin, operador, cliente
- **L (de `entrega`):** entregas por `status`, atrasadas (`data_prevista` vencida e não entregue), sem motorista
  (`motorista_id` nulo), concluídas hoje, % no prazo; motoristas disponíveis (`motorista.disponibilidade`).
- Admin vê também a soma de `valor_frete`. Cliente vê só as dele, sem frete nem motorista.
- Lista "precisam de atenção" (atrasadas e sem motorista) com atalho para o detalhe.

### Entregas — lista — todos
- **Escopo:** admin/operador = todas · motorista = `motorista_id` dele · cliente = `cliente_id` dele.
- **L:** `codigo_rastreamento`, `codigo_pedido_externo`, `nome_destinatario`, `endereco_destino`, `status`,
  `data_prevista`; admin/operador também `cliente.nome` e `motorista.nome`.
- **Filtros e busca:** status, período, cliente, motorista, atrasadas; busca por código ou pedido externo.
- Selos "atrasada" e "sem motorista". Paginação. Motorista vê só as em andamento, ordenadas por `data_prevista`.

### Entrega — detalhe e histórico — todos ✅
- **L:** `entrega` (códigos, destinatário, origem, destino, datas, `status`), `item` (`descricao`, `quantidade`, `peso`),
  `historico_entrega` com `usuario.nome` e `perfil_acesso`; admin/operador também `cliente.nome`, `motorista.nome`,
  `valor_frete`.
- **Ações:** atualizar status e atribuir motorista, conforme o perfil.
- Mostra a situação calculada (no prazo, atrasada, entregue no prazo ou com atraso).
- Pronta em `sistema/historico-entrega.html` (falta ligar ao banco).

### Nova entrega — cliente, operador, admin
- **E:** `codigo_pedido_externo` (único por cliente), `nome_destinatario`, `documento_destinatario` (opcional),
  `endereco_origem`, `endereco_destino`, `data_prevista` (opcional), itens (mín. 1: `descricao`, `quantidade`,
  `peso`, `valor_declarado` opcional). Admin/operador escolhem o `cliente_id`; o cliente logado usa o próprio.
- **Gerado pelo sistema:** `codigo_rastreamento`, `data_solicitacao`, `status = solicitada`, `valor_frete`
  (taxa fixa + valor por kg), primeiro registro do histórico.
- Pedido repetido do mesmo cliente avisa e abre a entrega existente.

### Atualizar status — motorista, operador, admin
- Mostra só o **próximo status permitido** para o perfil. Entrada: `observacao` (opcional).
- **E:** `entrega.status`, novo `historico_entrega` (`usuario_id` do logado), `data_conclusao` ao entregar.
- Pensada para celular: botão grande e poucos campos.

### Atribuir motorista — operador, admin
- **L:** motoristas com `disponibilidade`, disponíveis em destaque. **E:** `entrega.motorista_id`.
- Só para entregas não concluídas.

### Minhas entregas — motorista
- **L:** entregas dele em andamento: código, destinatário, `endereco_destino`, `data_prevista`, `status`, itens e peso total.
- No detalhe: `documento_destinatario` para conferir a entrega e o botão de atualizar status.

### Clientes — admin (cria e edita), operador (só leitura)
- **Lista:** `nome`, `cpf_cnpj` (mascarado), `email`, `telefone`, quantidade de entregas.
- **Formulário (admin):** `nome`, `cpf_cnpj`, `email`, `telefone`, `endereco` e login opcional (`usuario_id`, perfil `cliente`).
- **Detalhe:** dados, últimas entregas e integrações.

### Motoristas — admin (cria e edita), operador (só leitura)
- **Lista:** `nome`, `telefone`, `disponibilidade`, entregas em andamento.
- **Formulário (admin):** `nome`, `cpf`, `cnh`, `telefone`, `email`, `disponibilidade` e login (`usuario_id`, perfil `motorista`).
- `cpf` e `cnh` só para admin e operador.

### Usuários — admin
- **Lista:** `nome`, `perfil_acesso`, `data_cadastro`. **E:** criar login (Supabase Auth), definir perfil, redefinir senha.
- Não remover o último admin; o usuário `sistema` não aparece nem é editável.

### Integrações de API — admin, cliente (as dele)
- **Lista:** `nome`, `chave_identificacao`, `status` (`ativa`/`inativa`), `data_criacao`, `data_ultima_utilizacao`.
- **E:** criar (escolhe cliente e nome), ativar/desativar, gerar novo segredo.
- O `segredo` é exibido **uma única vez**, ao criar, com botão copiar e aviso. Link para a documentação da API.

### Relatórios — admin
- Entregas por período, cliente, motorista e status; % no prazo; tempo médio de entrega; `valor_frete` por período e
  por cliente. Exportar CSV.

### Meu perfil — todos
- Editar `usuario.nome` e trocar a senha. Motorista também edita `disponibilidade` e `telefone`.

---

## Dados sensíveis

- `valor_frete`: só admin e operador; o cliente não vê.
- `cliente.cpf_cnpj`: mascarado; completo só para admin e operador.
- `entrega.documento_destinatario`: visível para motorista, operador e admin; mascarado para o cliente.
- `motorista.cpf` e `cnh`: só admin e operador.
- `integracao_api.segredo`: nunca reexibido. Senhas não aparecem em tela alguma (ficam no Supabase Auth).

## Fases sugeridas

1. Login, estrutura com menu por perfil, Entregas (lista) e Entrega (detalhe ✅).
2. Nova entrega, Atualizar status, Atribuir motorista, Painel.
3. Clientes, Motoristas, Usuários.
4. Integrações de API, Relatórios, Meu perfil.

## Referências

- Estrutura e convenções do front: `sistema/README.md` · contrato da tela de histórico: `sistema/docs/modelo-de-dados.md`.
- API de integração das lojas: `api/README.md`. Enquanto o back-end do sistema interno não existe, o front usa dados de
  demonstração (`sistema/assets/js/mock/`) acessados por `Korven.api.*`.
