# Sistema interno Korven — front-end

Base do sistema interno: **login, uma estrutura própria para cada perfil, rotas e casca das telas**. As telas entram uma a uma; enquanto uma não existe,
ela mostra um quadro "Em construção" até receber o conteúdo. Telas, perfis e dados de cada uma estão em
[../docs/telas-do-sistema.md](../docs/telas-do-sistema.md).

HTML, CSS e JS puros, sem build — a mesma stack da landing. Abra com qualquer servidor estático:

```bash
cd transportadora-korven
python3 -m http.server 8080      # http://localhost:8080/sistema/
```

> Use um servidor (não `file://`): o nome do logo tem espaços e acentos.

## Acessos de demonstração

| Perfil | E-mail | Senha |
|---|---|---|
| admin | admin@korven.com | admin123 |
| operador | operador@korven.com | operador123 |
| motorista | motorista@korven.com | motorista123 |
| cliente | cliente@korven.com | cliente123 |

São dados de **mock** (`assets/js/mock/usuarios.js`). Somem quando o login for ligado ao Supabase Auth.

## Um shell por perfil

As telas (`Korven.views`) e as rotas (`#/entregas`…) são as mesmas; muda só a moldura em volta.

| Perfil | Página | Jeito |
|---|---|---|
| admin, operador | `app.html` | painel com menu lateral recolhível (vira gaveta no celular) e topo com usuário |
| motorista | `motorista.html` | app de celular escuro: saudação no topo, barra de abas embaixo e botão central **Status** (atualizar status). No computador vira uma coluna de celular centralizada |
| cliente | `cliente.html` | portal leve: faixa verde com navegação em pílulas, boas-vindas e "Nova entrega" no Painel, conteúdo em folha clara |

Depois do login cada perfil cai na sua página (`Korven.auth.destino`), e quem abre a página errada é redirecionado.
A tela do cliente é **clara**: dentro de `.sheet` as variáveis `--fg`, `--muted`, `--line`, `--accent`… já valem o tema claro,
então use-as nas telas em vez de cores fixas e elas funcionam nos três shells.

## Estrutura

```
sistema/
├─ index.html            decide entre login e o shell do perfil conforme a sessão
├─ login.html            tela de login (entrar, mostrar senha, recuperar senha)
├─ app.html              shell admin/operador (menu lateral)
├─ motorista.html        shell do motorista (abas embaixo)
├─ cliente.html          shell do cliente (portal)
└─ assets/
   ├─ css/  base.css · components.css · views.css · login.css · shell.css · motorista.css · cliente.css
   └─ js/
      ├─ icons.js        Korven.icon("nome")
      ├─ routes.js       mapa de telas: rota, título, ícone, perfis e menu
      ├─ api.js          Korven.api.*  ← único ponto que fala com dados (hoje mock)
      ├─ auth.js         sessão: Korven.auth.usuario / entrar / sair / exigir
      ├─ comum.js        o que os shells dividem: menu do usuário, saudação e roteador por hash
      ├─ app.js · motorista.js · cliente.js   um por shell
      ├─ login.js
      ├─ telas.js        carregador das telas em pasta + helper Korven.view(...)
      ├─ mock/           dados de demonstração
      └─ views/          só placeholder.js (telas provisórias e de erro)
   └─ views/             uma pasta por tela: <id>/<id>.html · <id>.css · <id>.js
```

## Como criar uma tela

Cada tela é uma pasta em `assets/views/<id>/` com três arquivos de mesmo nome: HTML (estrutura), CSS (estilo) e JS (comportamento).

1. A rota já existe em `assets/js/routes.js` (perfis, ícone e menu). Para uma tela nova, adicione uma linha lá.
2. Crie a pasta com o **id da rota** (a barra vira hífen: `entregas/nova` → `assets/views/entregas-nova/entregas-nova.html` etc.).
3. No JS, registre o comportamento com o helper `Korven.view` (o id é o da rota, com a barra):

```js
Korven.view("entregas/nova", function (container, ctx) {
    // container já contém o entregas-nova.html; ctx = { usuario, perfil, rota }

    // opcional: devolva uma função de limpeza (timers, listeners)
    return function () {};
});
```

Pronto: não há `<script>` para incluir nos shells. O roteador (via `telas.js`) busca os três arquivos na primeira visita à tela.
Só o `.html` é obrigatório; sem `.css` ou `.js` a tela abre igual. Sem o `.html`, a rota exibe o quadro "Em construção".
Precisa de servidor (usa `fetch`), como o resto do sistema.

**Modelos:** `assets/views/exemplo/` (simples e comentado, abre em `#/exemplo`) e `assets/views/entregas/` (lista completa com busca, filtro e dados por `Korven.api.listarEntregas`). Copie uma das pastas para começar.

Prefixe as classes do CSS (`.ex-`, `.ent-`) para o estilo de uma tela não afetar as outras.
A forma antiga (`Korven.views["id"] = function (container, ctx) {…}` com `<script>` nos shells) continua funcionando e tem prioridade sobre a pasta.

Convenções:

- Rotas por hash: `#/painel`, `#/entregas`, `#/entregas/nova`. O menu e o acesso saem de `routes.js`.
- Dados sempre por `Korven.api.*` (adicione as funções em `api.js`), nunca direto na tela — a troca do mock pelo Supabase fica num só lugar.
- Texto vindo de dados entra por `textContent`, não por `innerHTML`.
- Cores e fontes são variáveis em `base.css` (`--lime`, `--forest`, `--d`, `--b`), as mesmas da landing.

## Segurança

O front só **esconde** o que o perfil não pode ver. A proteção real dos dados é do banco (RLS), como diz o doc de telas.
Nunca guarde segredo ou senha no front; as do mock existem só para demonstração.
