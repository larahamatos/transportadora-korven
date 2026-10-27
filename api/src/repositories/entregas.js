// repositório de entregas — IMPLEMENTAÇÃO TEMPORÁRIA EM MEMÓRIA (os dados somem ao reiniciar)
//
// Quando o banco existir, reescreva só este arquivo mantendo estes métodos e formatos.
// Toda consulta filtra por clienteId: uma loja nunca enxerga entregas de outra.
//
//   buscarPorCodigo(clienteId, codigo)  -> { entrega, itens, historico } | null
//   buscarPorPedido(clienteId, pedido)  -> { entrega, itens, historico } | null
//   criar(clienteId, d)                 -> grava entrega + itens + 1º registro do histórico
//                                          de forma atômica; lança ConflitoUnico("codigo_rastreamento")
//                                          ou ConflitoUnico("codigo_pedido_externo") se violar unicidade
//   listar(clienteId, filtros)          -> { total, linhas } (linhas = só o objeto "entrega")
//
// O formato de { entrega, itens, historico } está em sistema/docs/modelo-de-dados.md.

const { ConflitoUnico } = require("../errors");

function copia(o) {
    return JSON.parse(JSON.stringify(o));
}

module.exports = function entregas() {
    const registros = [];   // { clienteId, entrega, itens, historico }

    function achar(clienteId, campo, valor) {
        return registros.filter((r) => r.clienteId === clienteId && r.entrega[campo] === valor)[0] || null;
    }

    function saida(r) {
        return r ? copia({ entrega: r.entrega, itens: r.itens, historico: r.historico }) : null;
    }

    return {
        buscarPorCodigo(clienteId, codigo) {
            return saida(achar(clienteId, "codigo_rastreamento", codigo));
        },

        buscarPorPedido(clienteId, pedido) {
            return saida(achar(clienteId, "codigo_pedido_externo", pedido));
        },

        criar(clienteId, d) {
            if (registros.some((r) => r.entrega.codigo_rastreamento === d.codigo)) {
                throw new ConflitoUnico("codigo_rastreamento");
            }

            if (achar(clienteId, "codigo_pedido_externo", d.pedido)) {
                throw new ConflitoUnico("codigo_pedido_externo");
            }

            registros.push({
                clienteId,
                entrega: {
                    codigo_rastreamento: d.codigo,
                    codigo_pedido_externo: d.pedido,
                    nome_destinatario: d.destinatario,
                    endereco_origem: d.origem,
                    endereco_destino: d.destino,
                    data_solicitacao: d.solicitacao,
                    data_prevista: d.prevista,
                    data_conclusao: null,
                    status: "solicitada"
                },
                itens: d.itens.map((x) => ({ descricao: x.descricao, quantidade: x.quantidade, peso: x.peso })),
                historico: [{
                    status_anterior: null,
                    status_novo: "solicitada",
                    data_alteracao: d.solicitacao,
                    observacao: d.observacao,
                    usuario: { nome: d.usuario.nome, perfil: d.usuario.perfil }
                }]
            });
        },

        // mais recentes primeiro
        listar(clienteId, f) {
            const todas = registros
                .filter((r) => r.clienteId === clienteId)
                .filter((r) => !f.pedido || r.entrega.codigo_pedido_externo === f.pedido)
                .filter((r) => !f.status || r.entrega.status === f.status)
                .reverse();

            return {
                total: todas.length,
                linhas: todas.slice(f.offset, f.offset + f.limite).map((r) => copia(r.entrega))
            };
        }
    };
};
