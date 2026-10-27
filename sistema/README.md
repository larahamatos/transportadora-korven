# Sistema interno Korven — front-end

Base do sistema interno: **login, uma estrutura própria para cada perfil, rotas e casca das telas**. As telas em si ainda não existem; cada uma
mostra um quadro "Em construção" até receber o conteúdo. Telas, perfis e dados de cada uma estão em
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
      ├─ mock/           dados de demonstração
      └─ views/          uma tela por arquivo (placeholder.js traz as provisórias)
```

## Como criar uma tela

1. A rota já existe em `assets/js/routes.js` (perfis, ícone e menu). Para uma tela nova, adicione uma linha lá.
2. Crie `assets/js/views/<id>.js` (`entregas/nova` → `entregas-nova.js`):

```js
Korven.views["entregas"] = function (container, ctx) {
    // ctx = { usuario, perfil, rota }
    container.innerHTML = "<h2>Entregas</h2>";

    // opcional: devolva uma função de limpeza (timers, listeners)
    return function () {};
};
```

3. Inclua o `<script>` nos shells que usam a tela (`app.html`, `motorista.html`, `cliente.html`), antes do JS do shell. Enquanto não houver view registrada, a rota exibe o quadro provisório.

Convenções:

- Rotas por hash: `#/painel`, `#/entregas`, `#/entregas/nova`. O menu e o acesso saem de `routes.js`.
- Dados sempre por `Korven.api.*` (adicione as funções em `api.js`), nunca direto na tela — a troca do mock pelo Supabase fica num só lugar.
- Texto vindo de dados entra por `textContent`, não por `innerHTML`.
- Cores e fontes são variáveis em `base.css` (`--lime`, `--forest`, `--d`, `--b`), as mesmas da landing.

## Segurança

O front só **esconde** o que o perfil não pode ver. A proteção real dos dados é do banco (RLS), como diz o doc de telas.
Nunca guarde segredo ou senha no front; as do mock existem só para demonstração.
