# Sistema interno Korven (front-end)

Área interna da transportadora: painel, entregas, cadastros, integrações de API e relatórios. HTML, CSS e JavaScript
puros, sem build, no mesmo estilo da landing page. Dados e login vêm do Supabase (veja `../docs/banco-de-dados.md`).

## Como abrir

Sirva a pasta do projeto (ex.: `python -m http.server 5173` na raiz) e acesse `http://localhost:5173/sistema/`.
As contas de demonstração vêm do `supabase/seed.sql` (senha definida por quem roda o seed). Para usar outro projeto
Supabase, troque a URL e a chave pública em `assets/js/core/config.js` (veja `../docs/banco-de-dados.md`).

## Telas

`index.html` é uma aplicação de página única com rotas por hash: `#/painel`, `#/entregas`, `#/entregas/nova`,
`#/entregas/KV-123456`, `#/clientes`, `#/motoristas`, `#/usuarios`, `#/integracoes`, `#/relatorios`, `#/perfil`.
O menu e as telas liberadas mudam conforme o perfil (admin, operador, motorista, cliente), como em
`../docs/telas-do-sistema.md`. A linha do tempo animada fica em `historico-entrega.html?codigo=KV-123456`.

## Estrutura

```
sistema/
├─ index.html                    login + casca + roteador
├─ historico-entrega.html        linha do tempo da entrega (exige login)
├─ assets/
│  ├─ css/
│  │  ├─ base.css · shell.css · componentes.css   variáveis, casca, botões
│  │  ├─ ui.css                  cartões, formulários, tabelas, janelas, menu móvel
│  │  └─ paginas/                login.css, sistema.css (telas) e historico-entrega.css
│  └─ js/
│     ├─ core/                   dom, formato, config (Supabase), status, sessao, menu
│     ├─ componentes/            aviso, fundo, ui (janelas e campos), graficos (SVG)
│     ├─ api/                    ÚNICO ponto de acesso aos dados: entregas.js e cadastros.js
│     ├─ paginas/                uma tela por arquivo (painel, entregas, entrega, ...)
│     └─ app.js                  login, topo e roteador
└─ docs/                         modelo-de-dados.md e acessos-demo.txt (local)
```

## Convenções

- Scripts clássicos (sem módulos), tudo no namespace `window.Korven` (`Korven.api`, `Korven.ui`, `Korven.sessao`...).
- Telas **nunca** falam com o Supabase: usam `Korven.api.*`. Cada tela é registrada em `Korven.paginas.<nome>` com
  `{ titulo, render(el, ctx) }` e recebe um elemento novo a cada navegação.
- O front esconde o que o perfil não pode ver, mas quem protege de verdade é o banco (RLS e funções).
- Páginas novas: crie `assets/js/paginas/nome.js`, registre-a em `index.html` e, se for uma rota nova, em
  `core/menu.js`.
- A chave em `core/config.js` é a pública (anon); a de serviço nunca vai para o navegador.
