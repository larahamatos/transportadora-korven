# API de integração Korven

API REST para **lojas e clientes** criarem entregas a partir dos seus pedidos e acompanharem status e histórico.
Contrato completo em [openapi.yaml](openapi.yaml); formato dos dados em
[../sistema/docs/modelo-de-dados.md](../sistema/docs/modelo-de-dados.md).

Node.js 20.6+ (testado no 24) e Express.

> **Usa o banco Supabase** (`../docs/banco-de-dados.md`). As lojas são as integrações criadas na tela "Integrações de API"
> do sistema; o token que ela mostra (`chave.segredo`, uma única vez) é a chave desta API. Sem `SUPABASE_URL` e
> `SUPABASE_ANON_KEY` no `.env`, a API cai no modo em memória (só para desenvolvimento e testes).

## Como rodar

```bash
cd api
npm install
cp .env.example .env     # já traz a URL e a chave pública do projeto Supabase
npm start                # http://localhost:3000
npm test                 # testes de ponta a ponta (modo em memória, sem rede)
```

Para criar a chave de uma loja: entre no sistema, abra **Integrações de API**, crie uma integração e copie o token.
No modo em memória, use `npm run gerar-chave -- "LojaVerde"` e a variável `CLIENTES` do `.env`.

## Uso

Toda chamada em `/api/v1` envia o token da loja: `Authorization: Bearer <chave>.<segredo>` (ou `X-API-Key: <chave>.<segredo>`).

```bash
# cria a entrega do pedido (201). Reenviar o mesmo pedido devolve a existente (200).
curl -X POST http://localhost:3000/api/v1/entregas \
  -H "Authorization: Bearer $CHAVE" -H "Content-Type: application/json" \
  -d '{
    "codigo_pedido_externo": "LV-90417",
    "nome_destinatario": "Marina Souza Almeida",
    "endereco_origem": "Porto Alegre/RS",
    "endereco_destino": "São Paulo/SP",
    "itens": [{ "descricao": "Monitor 27\"", "quantidade": 3, "peso": 21 }]
  }'

# consulta com itens e histórico
curl http://localhost:3000/api/v1/entregas/KV-476321 -H "Authorization: Bearer $CHAVE"

# lista (filtros: codigo_pedido_externo, status, limite, pagina)
curl "http://localhost:3000/api/v1/entregas?status=em_rodovia&limite=10" -H "Authorization: Bearer $CHAVE"
```

| Endpoint | Função |
|---|---|
| `POST /api/v1/entregas` | cria a entrega (status `solicitada`, histórico aberto, código `KV-NNNNNN`) |
| `GET /api/v1/entregas/{codigo}` | `{ entrega, itens, historico }` |
| `GET /api/v1/entregas` | lista paginada das entregas da loja |
| `GET /docs` | documentação interativa (Swagger UI, com "Try it out") |
| `GET /saude` | verificação de funcionamento (sem chave) |

Erros seguem sempre `{ "erro": { "codigo", "mensagem", "detalhes"? } }`:
`401` chave inválida · `404` não encontrada · `413` corpo > 100 KB · `415` não é JSON ·
`422` campos inválidos (com a lista de campos) · `429` limite excedido (com `Retry-After`).

## Regras

- Cada loja só enxerga as próprias entregas; entrega de outra loja responde `404`.
- `codigo_pedido_externo` é único por loja: a criação é idempotente, inclusive com requisições simultâneas.
- Sem `data_prevista`, vale o prazo padrão (`PRAZO_PADRAO_DIAS`, 5 dias). Se enviada, precisa ser futura.
- Limites: 120 requisições/min por chave e 10 tentativas inválidas/min por IP (ajustáveis no `.env`).
- O segredo só aparece quando é gerado; o banco guarda apenas o hash SHA-256. Integração inativa responde `401`.

## Estrutura

```
api/
├─ scripts/gerar-chave.js   gera a chave de uma loja e a linha do .env
├─ src/
│  ├─ app.js · server.js · config.js · errors.js
│  ├─ routes/               rotas HTTP
│  ├─ services/             regras de negócio
│  ├─ repositories/         ÚNICO lugar que acessa dados: supabase.js (produção) e em memória (testes)
│  ├─ validators/           validação de entrada
│  └─ middlewares/          autenticação, limite de uso, erros
└─ tests/                   testes de ponta a ponta
```

## Como a API fala com o banco

`src/repositories/supabase.js` chama funções `api_*` do banco (`api_autenticar`, `api_criar_entrega`,
`api_detalhe_entrega`, `api_listar_entregas`) usando só a chave pública. Cada função recebe o token da loja, confere o
hash e só enxerga as entregas dela. A criação é atômica (entrega, itens e 1º histórico, com usuário "Integração Korven"
de perfil `sistema`) e a unicidade de código e de pedido vira `ConflitoUnico`, o que mantém a criação idempotente.
Cada chamada autenticada atualiza `data_ultima_utilizacao` da integração (no máximo uma vez por minuto).

## Antes de ir para produção

Servir atrás de HTTPS e, com mais de uma instância, mover o limite de uso para um armazenamento compartilhado.
Próximos passos naturais: webhook para avisar a loja a cada mudança de status e os endpoints do sistema interno
(registrar status e consultar o histórico), que reutilizam estes serviços.
