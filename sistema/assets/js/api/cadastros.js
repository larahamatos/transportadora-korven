//acesso aos dados de clientes, motoristas, usuários, integrações e perfil

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var sb = K.sb;

    function limpar(d, campos) {
        var o = {};

        campos.forEach(function (c) {
            var v = d[c];

            o[c] = typeof v === "string" ? (v.trim() || null) : (v === undefined ? null : v);
        });

        return o;
    }

    // chama a Edge Function de usuários (só admin)
    function funcaoUsuarios(corpo) {
        return sb.functions.invoke("gerenciar-usuarios", { body: corpo }).then(function (r) {
            if (r.error) {
                var ctx = r.error.context;

                if (ctx && typeof ctx.json === "function") {
                    return ctx.json().then(function (j) {
                        throw new Error(j.erro || "Não foi possível concluir a ação.");
                    }, function () {
                        throw new Error("Não foi possível concluir a ação.");
                    });
                }

                throw new Error(K.erro(r.error));
            }

            return r.data;
        });
    }

    K.api.clientes = {
        // [ { id, nome, cpf_cnpj, email, telefone, endereco, usuario_id, entregas } ]
        listar: function () {
            return Promise.all([
                sb.from("cliente").select("id, nome, cpf_cnpj, email, telefone, endereco, usuario_id, data_cadastro").order("nome").then(K.ok),
                sb.from("entrega").select("cliente_id").then(K.ok)
            ]).then(function (r) {
                var cont = {};

                r[1].forEach(function (e) {
                    cont[e.cliente_id] = (cont[e.cliente_id] || 0) + 1;
                });

                return r[0].map(function (c) {
                    c.entregas = cont[c.id] || 0;

                    return c;
                });
            });
        },

        // lista enxuta para <select>
        opcoes: function () {
            return sb.from("cliente").select("id, nome, usuario_id").order("nome").then(K.ok);
        },

        salvar: function (id, d) {
            var dados = limpar(d, ["nome", "cpf_cnpj", "email", "telefone", "endereco"]);
            var alvo = sb.from("cliente");

            return (id ? alvo.update(dados).eq("id", id) : alvo.insert(dados)).select("id").single().then(K.ok);
        },

        ultimasEntregas: function (id) {
            return sb.from("entrega").select("codigo_rastreamento, status, nome_destinatario, data_solicitacao").eq("cliente_id", id).order("data_solicitacao", { ascending: false }).limit(5).then(K.ok);
        },

        integracoes: function (id) {
            return sb.from("integracao_api").select("id, nome, status").eq("cliente_id", id).then(K.ok);
        }
    };

    K.api.motoristas = {
        // [ { id, nome, cpf, cnh, telefone, email, disponibilidade, usuario_id, andamento } ]
        listar: function () {
            return Promise.all([
                sb.from("motorista").select("id, nome, cpf, cnh, telefone, email, disponibilidade, usuario_id").order("nome").then(K.ok),
                sb.from("entrega").select("motorista_id").not("motorista_id", "is", null).neq("status", "entregue").then(K.ok)
            ]).then(function (r) {
                var cont = {};

                r[1].forEach(function (e) {
                    cont[e.motorista_id] = (cont[e.motorista_id] || 0) + 1;
                });

                return r[0].map(function (m) {
                    m.andamento = cont[m.id] || 0;

                    return m;
                });
            });
        },

        salvar: function (id, d) {
            var dados = limpar(d, ["nome", "cpf", "cnh", "telefone", "email"]);

            if (d.disponibilidade) {
                dados.disponibilidade = d.disponibilidade;
            }

            var alvo = sb.from("motorista");

            return (id ? alvo.update(dados).eq("id", id) : alvo.insert(dados)).select("id").single().then(K.ok);
        },

        // o próprio motorista (tela Meu perfil)
        salvarPerfil: function (id, telefone, disponibilidade) {
            return sb.from("motorista").update({ telefone: telefone || null, disponibilidade: disponibilidade }).eq("id", id).then(K.ok);
        }
    };

    K.api.usuarios = {
        listar: function () {
            return funcaoUsuarios({ acao: "listar" }).then(function (r) {
                return r.usuarios;
            });
        },

        criar: function (d) {
            return funcaoUsuarios(Object.assign({ acao: "criar" }, d));
        },

        atualizar: function (id, d) {
            return funcaoUsuarios(Object.assign({ acao: "atualizar", id: id }, d));
        },

        redefinirSenha: function (id, senha) {
            return funcaoUsuarios({ acao: "redefinir_senha", id: id, senha: senha });
        },

        // próprio nome (tela Meu perfil)
        salvarNome: function (id, nome) {
            return sb.from("usuario").update({ nome: nome }).eq("id", id).then(K.ok);
        },

        trocarSenha: function (senha) {
            return sb.auth.updateUser({ password: senha }).then(function (r) {
                if (r.error) {
                    throw new Error(K.erro(r.error));
                }
            });
        }
    };

    K.api.integracoes = {
        listar: function () {
            return sb.from("integracao_api").select("id, cliente_id, nome, chave_identificacao, status, data_criacao, data_ultima_utilizacao, cliente:cliente_id(nome)").order("data_criacao", { ascending: false }).then(K.ok);
        },

        // -> { id, nome, chave_identificacao, segredo }  (o segredo só existe nesta resposta)
        criar: function (clienteId, nome) {
            return sb.rpc("criar_integracao", { p_cliente_id: clienteId || null, p_nome: nome }).then(K.ok);
        },

        novoSegredo: function (id) {
            return sb.rpc("gerar_novo_segredo", { p_id: id }).then(K.ok);
        },

        status: function (id, status) {
            return sb.rpc("alterar_status_integracao", { p_id: id, p_status: status }).then(K.ok);
        }
    };

})(window.Korven);
