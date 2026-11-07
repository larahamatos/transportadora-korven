# Korven — logística em movimento

Site, sistema interno e API de integração de uma transportadora.

| Parte | Onde | O que é |
|---|---|---|
| Site | `index.html`, `style.css`, `script.js` | Landing page da transportadora |
| Rastreio público | `rastreio.html` | Consulta o andamento de uma entrega pelo código (`KV-123456`), sem login |
| Sistema interno | `sistema/` | Painel, entregas, clientes, motoristas, usuários, integrações de API e relatórios, por perfil (admin, operador, motorista, cliente) |
| API de integração | `api/` | API REST para as lojas criarem e consultarem entregas |
| Banco | `supabase/` | `schema.sql` e `seed.sql` (PostgreSQL / Supabase) e a Edge Function de usuários |

Tudo é HTML, CSS e JavaScript puros (sem build); a API usa Node.js 20+ e Express.

## Como rodar

1. **Banco:** siga "Criar o banco do zero" em [docs/banco-de-dados.md](docs/banco-de-dados.md) (schema, seed e as chaves no front).
2. **Site e sistema:** na raiz, `python -m http.server 5173` e abra `http://localhost:5173/` (site),
   `/rastreio.html` e `/sistema/` (login).
3. **API:** `cd api && npm install && cp .env.example .env && npm start` (veja [api/README.md](api/README.md)).

## Documentação

- [docs/banco-de-dados.md](docs/banco-de-dados.md): tabelas, segurança (RLS), funções e como criar o banco.
- [docs/telas-do-sistema.md](docs/telas-do-sistema.md): telas, perfis e dados de cada uma.
- [sistema/README.md](sistema/README.md): estrutura e convenções do front-end.
- [api/README.md](api/README.md) e [api/openapi.yaml](api/openapi.yaml): API de integração.

## Segurança

O front usa só a chave pública (anon) do Supabase; a proteção dos dados é do banco (RLS e funções). Nunca coloque a
chave `service_role` no navegador nem no repositório.
