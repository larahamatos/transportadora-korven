// repositórios em produção: Supabase (PostgreSQL), pelas funções api_* do banco
//
// A API usa só a chave pública (anon) do projeto. Quem protege os dados é o banco: cada função recebe o token da
// loja ("chave.segredo", criado na tela "Integrações de API" do sistema), confere o hash e só enxerga as entregas
// daquela loja. O contrato é o mesmo dos repositórios em memória (clientes.js e entregas.js).

const { ConflitoUnico, naoAutenticado } = require("../errors");

module.exports = function supabase(url, chavePublica) {
    const base = url.replace(/\/+$/, "") + "/rest/v1/rpc/";

    async function rpc(nome, args) {
        const r = await fetch(base + nome, {
            method: "POST",
            headers: {
                "apikey": chavePublica,
                "Authorization": "Bearer " + chavePublica,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(args)
        });

        if (r.ok) {
            const t = await r.text();

            return t ? JSON.parse(t) : null;
        }

        const e = await r.json().catch(() => ({}));

        if (e.code === "23505") {
            throw new ConflitoUnico(/pedido/.test(e.message || "") ? "codigo_pedido_externo" : "codigo_rastreamento");
        }

        if (e.code === "28000") {
            throw naoAutenticado();
        }

        throw new Error("Falha no banco (" + r.status + "): " + (e.message || "sem detalhes"));
    }

    return {
        clientes: {
            async autenticar(chave) {
                const c = await rpc("api_autenticar", { p_token: chave });

                return c ? { id: c.id, nome: c.nome, token: chave } : null;
            }
        },

        entregas: {
            buscarPorCodigo(cliente, codigo) {
                return rpc("api_detalhe_entrega", { p_token: cliente.token, p_codigo: codigo, p_pedido: null });
            },

            buscarPorPedido(cliente, pedido) {
                return rpc("api_detalhe_entrega", { p_token: cliente.token, p_codigo: null, p_pedido: pedido });
            },

            async criar(cliente, d) {
                await rpc("api_criar_entrega", {
                    p_token: cliente.token,
                    p_codigo: d.codigo,
                    p_pedido: d.pedido,
                    p_destinatario: d.destinatario,
                    p_origem: d.origem,
                    p_destino: d.destino,
                    p_prevista: d.prevista,
                    p_itens: d.itens
                });
            },

            listar(cliente, f) {
                return rpc("api_listar_entregas", {
                    p_token: cliente.token,
                    p_pedido: f.pedido,
                    p_status: f.status,
                    p_limite: f.limite,
                    p_offset: f.offset
                });
            }
        }
    };
};
