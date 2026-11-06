//acesso aos dados de entregas (Supabase)
//
// Leituras de lista usam a tabela (o RLS limita ao que o perfil pode ver). Detalhe, criação, status e
// motorista passam por funções do banco, que aplicam as regras e escondem o que o perfil não pode ver.
// Páginas falam só com K.api.*; nenhuma conhece o Supabase diretamente.

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var COLUNAS = "id, codigo_rastreamento, codigo_pedido_externo, nome_destinatario, endereco_origem, endereco_destino, status, data_solicitacao, data_prevista, data_conclusao, motorista_id, cliente_id";

    function proximoDia(iso) {
        var d = new Date(iso + "T00:00:00");

        d.setDate(d.getDate() + 1);

        return d.toISOString();
    }

    K.api = K.api || {};

    K.api.entregas = {
        // filtros: busca, status, cliente, motorista, atrasadas, semMotorista, andamento, de, ate, ordem, pagina, porPagina
        // -> { linhas, total }
        listar: function (f) {
            var staff = K.sessao.staff;
            var n = f.porPagina || 15;
            var p = f.pagina || 1;
            var q = K.sb.from("entrega")
                .select(COLUNAS + (staff ? ", cliente:cliente_id(nome), motorista:motorista_id(nome)" : ""), { count: "exact" });

            if (f.busca) {
                var t = f.busca.replace(/[%,()*\\]/g, " ").trim();

                if (t) {
                    q = q.or("codigo_rastreamento.ilike.*" + t + "*,codigo_pedido_externo.ilike.*" + t + "*,nome_destinatario.ilike.*" + t + "*");
                }
            }

            if (f.status) {
                q = q.eq("status", f.status);
            }

            if (f.cliente) {
                q = q.eq("cliente_id", f.cliente);
            }

            if (f.motorista) {
                q = q.eq("motorista_id", f.motorista);
            }

            if (f.atrasadas) {
                q = q.neq("status", "entregue").lt("data_prevista", new Date().toISOString());
            }

            if (f.semMotorista) {
                q = q.is("motorista_id", null).neq("status", "entregue");
            }

            if (f.andamento) {
                q = q.neq("status", "entregue");
            }

            if (f.de) {
                q = q.gte("data_solicitacao", new Date(f.de + "T00:00:00").toISOString());
            }

            if (f.ate) {
                q = q.lt("data_solicitacao", proximoDia(f.ate));
            }

            q = f.ordem === "prevista" ? q.order("data_prevista", { ascending: true }) : q.order("data_solicitacao", { ascending: false });

            return q.range((p - 1) * n, p * n - 1).then(function (r) {
                return { linhas: K.ok(r) || [], total: r.count || 0 };
            });
        },

        // { entrega, itens, historico, acoes } ou null quando não existe (ou não é visível ao perfil)
        detalhe: function (codigo) {
            return K.sb.rpc("detalhe_entrega", { p_codigo: codigo }).then(K.ok);
        },

        // usado pela tela de histórico
        buscarPorCodigo: function (codigo) {
            return K.api.entregas.detalhe(codigo);
        },

        // [ { codigo_rastreamento, status, endereco_origem, endereco_destino } ]
        listarRecentes: function () {
            return K.sb.from("entrega")
                .select("codigo_rastreamento, status, endereco_origem, endereco_destino")
                .order("data_solicitacao", { ascending: false })
                .limit(8)
                .then(K.ok);
        },

        // d: { cliente_id, codigo_pedido_externo, nome_destinatario, documento_destinatario, endereco_origem,
        //      endereco_destino, data_prevista, itens: [{ descricao, quantidade, peso, valor_declarado }] }
        criar: function (d) {
            return K.sb.rpc("criar_entrega", {
                p_cliente_id: d.cliente_id || null,
                p_codigo_pedido_externo: d.codigo_pedido_externo,
                p_nome_destinatario: d.nome_destinatario,
                p_documento_destinatario: d.documento_destinatario || null,
                p_endereco_origem: d.endereco_origem,
                p_endereco_destino: d.endereco_destino,
                p_data_prevista: d.data_prevista || null,
                p_itens: d.itens
            }).then(K.ok);
        },

        avancar: function (id, observacao) {
            return K.sb.rpc("avancar_status", { p_entrega_id: id, p_observacao: observacao || null }).then(K.ok);
        },

        atribuir: function (id, motoristaId) {
            return K.sb.rpc("atribuir_motorista", { p_entrega_id: id, p_motorista_id: motoristaId || null }).then(K.ok);
        }
    };

    K.api.painel = {
        resumo: function () {
            return K.sb.rpc("painel").then(K.ok);
        },

        relatorio: function (inicio, fim) {
            return K.sb.rpc("relatorio", { p_inicio: inicio, p_fim: fim }).then(K.ok);
        }
    };

})(window.Korven);
