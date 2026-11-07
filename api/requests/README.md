# Requisições de teste da API

Duas formas de chamar a API sem escrever `curl` na mão. Nenhum arquivo contém token.

| Arquivo | Para quem | Como usar |
|---|---|---|
| `korven.http` | VS Code (extensão **REST Client**), IDEs da JetBrains, Zed | Abra o arquivo e clique em *Send Request* acima de cada bloco |
| `Korven-API.postman_collection.json` | **Postman, Insomnia, Bruno, Hoppscotch** | Importe o arquivo; cada requisição já traz testes automáticos com o status esperado |

## Antes de usar

1. **Suba a API** (`cd api && npm start`, em `http://localhost:3000`) ou use a publicada.
2. **Crie um token:** no sistema, em **Integrações de API → Nova integração**. O token (`chave.segredo`) aparece uma única vez.
3. **Preencha:** `@token` em `korven.http`, ou a variável `token` da coleção do Postman. Confira também `baseUrl`.
   Não faça commit com o token preenchido.

As requisições sem token (`/saude`, `/docs/openapi.json` e o grupo "Erros esperados") rodam sem preencher nada.
Na coleção, rode a pasta inteira (*Run collection*) para ver todos os testes passarem; o código de rastreio criado fica
guardado sozinho na variável `codigo`.

## O que cobrem

- **Sem token:** saúde da API e contrato OpenAPI.
- **Entregas:** criar (e reenviar o mesmo pedido, que não duplica), criar com data prevista, consultar, listar e filtrar
  por pedido e por status, e autenticar com `X-API-Key`.
- **Erros esperados:** sem token e token inválido (401), campos faltando, data no passado e status inválido (422),
  corpo que não é JSON (415), JSON quebrado (400), entrega inexistente e rota inexistente (404).

A documentação interativa, com "Try it out", fica em `/docs` da API.
