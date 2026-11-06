// regras de negócio das entregas criadas por integração

const crypto = require("node:crypto");
const { validacao, naoEncontrado, ConflitoUnico } = require("../errors");
const v = require("../validators/entrega");

function gerarCodigo() {
    return "KV-" + String(crypto.randomInt(0, 1e6)).padStart(6, "0");
}

function conflito(e, campo) {
    return e instanceof ConflitoUnico && e.campo === campo;
}

module.exports = function entregas(repo, config) {
    return {
        // cria a entrega. Reenviar o mesmo pedido da mesma loja devolve a entrega já existente.
        async criar(cliente, corpo) {
            const agora = new Date();
            const { valor, detalhes } = v.criarEntrega(corpo, agora, config.prazoPadraoDias);

            if (detalhes.length) {
                throw validacao(detalhes);
            }

            const existente = await repo.buscarPorPedido(cliente, valor.pedido);

            if (existente) {
                return { dados: existente, criada: false };
            }

            const dados = {
                pedido: valor.pedido,
                destinatario: valor.destinatario,
                origem: valor.origem,
                destino: valor.destino,
                itens: valor.itens,
                prevista: valor.prevista,
                solicitacao: agora.toISOString(),
                observacao: "Pedido " + valor.pedido + " recebido pela integração da " + cliente.nome + ".",
                usuario: { nome: "Integração " + cliente.nome, perfil: "sistema" }
            };

            // o código é aleatório; em caso de colisão sorteia outro
            for (let i = 0; i < 8; i++) {
                dados.codigo = gerarCodigo();

                try {
                    await repo.criar(cliente, dados);

                    return { dados: await repo.buscarPorCodigo(cliente, dados.codigo), criada: true };
                } catch (e) {
                    if (conflito(e, "codigo_rastreamento")) {
                        continue;
                    }

                    // duas requisições do mesmo pedido ao mesmo tempo: vale a que chegou primeiro
                    if (conflito(e, "codigo_pedido_externo")) {
                        return { dados: await repo.buscarPorPedido(cliente, valor.pedido), criada: false };
                    }

                    throw e;
                }
            }

            throw new Error("Não foi possível gerar um código de rastreamento único.");
        },

        async consultar(cliente, codigo) {
            const r = await repo.buscarPorCodigo(cliente, String(codigo).trim().toUpperCase());

            if (!r) {
                throw naoEncontrado("Entrega não encontrada.");
            }

            return r;
        },

        async listar(cliente, query) {
            const { valor, detalhes } = v.filtros(query);

            if (detalhes.length) {
                throw validacao(detalhes);
            }

            const r = await repo.listar(cliente, valor);

            return { dados: r.linhas, total: r.total, pagina: valor.pagina, limite: valor.limite };
        }
    };
};
