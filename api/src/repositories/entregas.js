// repositório de entregas em memória (os dados somem ao reiniciar), para desenvolvimento e testes sem banco.
// O de produção é o supabase.js, com o mesmo contrato. Toda consulta filtra pela loja: uma loja nunca enxerga
// entregas de outra. Os métodos recebem o objeto "cliente" devolvido por clientes.autenticar.
//
//   buscarPorCodigo(cliente, codigo)    -> { entrega, itens, historico } | null
//   buscarPorPedido(cliente, pedido)    -> { entrega, itens, historico } | null
//   criar(cliente, d)                   -> grava entrega + itens + 1º registro do histórico
//                                          de forma atômica; lança ConflitoUnico("codigo_rastreamento")
//                                          ou ConflitoUnico("codigo_pedido_externo") se violar unicidade
//   listar(cliente, filtros)           -> { total, linhas } (linhas = só o objeto "entrega")
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
        async buscarPorCodigo(cliente, codigo) {
            return saida(achar(cliente.id, "codigo_rastreamento", codigo));
        },

        async buscarPorPedido(cliente, pedido) {
            return saida(achar(cliente.id, "codigo_pedido_externo", pedido));
        },

        async criar(cliente, d) {
            const clienteId = cliente.id;

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
        async listar(cliente, f) {
            const todas = registros
                .filter((r) => r.clienteId === cliente.id)
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
