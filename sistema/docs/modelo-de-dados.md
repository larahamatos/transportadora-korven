# Modelo de dados usado pelo front do sistema interno

O front só mostra o que o banco guarda. Tudo o que aparece além disso (situação no prazo/atrasada, etapa atual,
totais da carga) é **calculado a partir destes campos**, nunca inventado.

Os nomes abaixo seguem as tabelas `entrega`, `item` e `historico_entrega`. Hoje esse formato é devolvido pela função
`detalhe_entrega(codigo)` do Supabase (veja `../../docs/banco-de-dados.md`), que acrescenta `entrega.id`, `cliente`,
`motorista` e `valor_frete` (só admin e operador) e `acoes` (próximo status e se pode atribuir motorista).

## Resposta de `detalhe_entrega(codigo)`

```json
{
  "entrega": {
    "codigo_rastreamento": "KV-48213",
    "codigo_pedido_externo": "LV-90417",
    "nome_destinatario": "Marina Souza Almeida",
    "endereco_origem": "Porto Alegre/RS",
    "endereco_destino": "São Paulo/SP",
    "data_solicitacao": "2026-10-24T22:01:00-03:00",
    "data_prevista": "2026-10-26T00:43:00-03:00",
    "data_conclusao": null,
    "status": "em_rodovia"
  },
  "itens": [
    { "descricao": "Monitor 27\"", "quantidade": 3, "peso": 21 }
  ],
  "historico": [
    {
      "status_anterior": "saiu_cd",
      "status_novo": "em_rodovia",
      "data_alteracao": "2026-10-25T13:01:00-03:00",
      "observacao": "Carga em trânsito pela rodovia.",
      "usuario": { "nome": "Carlos Mendes", "perfil": "motorista" }
    }
  ]
}
```

- Código inexistente (ou fora do escopo do perfil): devolve `null` e a tela mostra "Entrega não encontrada".
- Lista de entregas recentes: `[{ codigo_rastreamento, status, endereco_origem, endereco_destino }]`.

## Status (fluxo da entrega)

`solicitada` → `coletada` → `saiu_cd` → `em_rodovia` → `na_cidade` → `saiu_entrega` → `entregue`

Cada status vira uma etapa na linha do tempo. A etapa só tem data, observação e responsável quando existe
um registro em `historico_entrega` com aquele `status_novo`. Etapas futuras aparecem como "Pendente".

## O que cada campo alimenta

| Campo | Onde aparece |
|---|---|
| `codigo_rastreamento` | título do resumo, busca, migalhas |
| `codigo_pedido_externo` | "Pedido ..." no resumo |
| `nome_destinatario` | resumo |
| `endereco_origem` / `endereco_destino` | extremos do percurso |
| `data_solicitacao` | "Solicitada em" |
| `data_prevista` | "Previsão" e cálculo da situação; também no cartão da etapa final |
| `data_conclusao` | "Concluída em" e situação das entregas finalizadas |
| `status` | etapa atual, etiqueta e progresso |
| `itens[].descricao/quantidade/peso` | bloco "Carga" (soma de itens e peso total) |
| `historico[].data_alteracao` | data de cada etapa |
| `historico[].observacao` | texto do cartão |
| `historico[].usuario.nome/perfil` | "quem registrou" no cartão |

Perfis reconhecidos para exibição: `sistema`, `cliente`, `operador`, `motorista` (outros valores aparecem como vieram).

## O que o banco ainda **não** guarda (por isso a tela não mostra)

Distância/quilometragem, localização ou coordenadas do veículo, rodovia/cidade de passagem, placa ou veículo,
previsão por etapa (só existe `data_prevista` da entrega final), fonte do registro (app/scanner), foto ou assinatura
de comprovante. Se alguma dessas informações passar a existir, é só incluí-la na resposta e criar o trecho de tela.
