# API de integração Korven

API REST para **lojas e clientes** criarem entregas a partir dos seus pedidos e acompanharem status e histórico.
Contrato completo em [openapi.yaml](openapi.yaml); formato dos dados em
[../sistema/docs/modelo-de-dados.md](../sistema/docs/modelo-de-dados.md).

Node.js 20.6+ (testado no 24) e Express.

> **Sem banco por enquanto.** O banco será criado por outra pessoa da equipe. Até lá, as entregas ficam em memória
> (somem ao reiniciar) e as lojas autorizadas vêm do `.env`. A API já está separada para a troca: só os dois arquivos de
> `src/repositories/` falam com dados (veja "Ligando ao banco").

## Como rodar

```bash
cd api
npm install
npm run gerar-chave -- "LojaVerde"   # imprime a chave da loja e a linha para o .env
cp .env.example .env                 # cole a linha no CLIENTES= (várias lojas separadas por vírgula)
npm start                            # http://localhost:3000
npm test                             # testes de ponta a ponta
```

## Uso

Toda chamada em `/api/v1` envia a chave: `Authorization: Bearer <chave>` (ou `X-API-Key: <chave>`).

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
- A chave só aparece quando é gerada; o servidor guarda apenas o hash SHA-256.

## Estrutura

```
api/
├─ scripts/gerar-chave.js   gera a chave de uma loja e a linha do .env
├─ src/
│  ├─ app.js · server.js · config.js · errors.js
│  ├─ routes/               rotas HTTP
│  ├─ services/             regras de negócio
│  ├─ repositories/         ÚNICO lugar que acessa dados (hoje em memória)
│  ├─ validators/           validação de entrada
│  └─ middlewares/          autenticação, limite de uso, erros
└─ tests/                   testes de ponta a ponta
```

## Ligando ao banco

Reescreva só `src/repositories/clientes.js` e `src/repositories/entregas.js` mantendo os métodos documentados no topo
de cada arquivo, e passe-os ao `criarApp` em `src/server.js`. Serviços, rotas e testes continuam iguais.

O que o banco precisa oferecer à integração, além das tabelas `entrega`, `item` e `historico_entrega`:

- **Clientes (lojas)** com nome, hash SHA-256 da chave de API e indicador de ativo.
- **`entrega` ligada ao cliente** que a criou, para que cada loja enxergue só as suas.
- **Unicidade de `codigo_rastreamento`** e de **`(cliente, codigo_pedido_externo)`**. Ao violar qualquer uma,
  o repositório deve lançar `ConflitoUnico("<campo>")` (veja `src/errors.js`): é isso que gera um código novo em caso de
  colisão e torna a criação idempotente.
- **Criação atômica**: entrega, itens e o primeiro registro do histórico (`solicitada`, usuário "Integração <loja>",
  perfil `sistema`) na mesma transação.
- Se o histórico guardar o usuário como chave estrangeira, o repositório deve devolver `usuario: { nome, perfil }`.

## Antes de ir para produção

Servir atrás de HTTPS e, com mais de uma instância, mover o limite de uso para um armazenamento compartilhado.
Próximos passos naturais: webhook para avisar a loja a cada mudança de status e os endpoints do sistema interno
(registrar status e consultar o histórico), que reutilizam estes serviços.
