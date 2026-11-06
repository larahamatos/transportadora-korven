//clientes: lista para admin e operador; só o admin cria e edita (e libera o login do cliente)

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var ICO_VER = "M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z";
    var ICO_EDIT = "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4";

    function dado(r, v) {
        return '<div class="dado"><dt>' + r + "</dt><dd>" + (v ? esc(v) : "—") + "</dd></div>";
    }

    // valida e devolve mensagem de erro por campo
    function validar(v, comAcesso) {
        var e = {};
        var doc = K.fmt.digitos(v.cpf_cnpj).length;
        var tel = K.fmt.digitos(v.telefone).length;

        if (v.nome.length < 2) { e.nome = "Informe o nome."; }
        if (v.cpf_cnpj && doc !== 11 && doc !== 14) { e.cpf_cnpj = "CPF tem 11 dígitos e CNPJ, 14."; }
        if (v.email && !EMAIL.test(v.email)) { e.email = "E-mail inválido."; }
        if (v.telefone && tel !== 10 && tel !== 11) { e.telefone = "Informe DDD + número."; }

        if (comAcesso) {
            if (!v.email) { e.email = "O e-mail será o login do cliente."; }
            if (!v.senha || v.senha.length < 8) { e.senha = "Mínimo de 8 caracteres."; }
        }

        return e;
    }

    function formulario(c) {
        var novo = !c;
        var semAcesso = novo || !c.usuario_id;

        c = c || {};

        return '<div class="form">' + K.ui.campo({ id: "nome", rotulo: "Nome", valor: c.nome, req: true, attrs: 'maxlength="120"' }) +
            '<div class="grid2">' + K.ui.campo({ id: "cpf_cnpj", rotulo: "CPF/CNPJ", valor: c.cpf_cnpj, attrs: 'data-mask="doc" inputmode="numeric"' }) +
            K.ui.campo({ id: "telefone", rotulo: "Telefone", valor: c.telefone, attrs: 'data-mask="tel" inputmode="tel"' }) + "</div>" +
            K.ui.campo({ id: "email", rotulo: "E-mail", tipo: "email", valor: c.email, attrs: 'maxlength="120" autocomplete="off"' }) +
            K.ui.campo({ id: "endereco", rotulo: "Endereço", valor: c.endereco, attrs: 'maxlength="200"' }) +
            (semAcesso ? '<label class="check"><input type="checkbox" name="acesso" id="ck-acesso"> Criar acesso ao sistema para este cliente</label><div id="bloco-acesso" hidden>' +
                K.ui.campo({ id: "senha", rotulo: "Senha inicial", tipo: "password", ajuda: "O login é o e-mail acima. Combine a troca da senha com o cliente.", attrs: 'autocomplete="new-password" minlength="8"' }) + "</div>" : '<p class="aviso-ok">Este cliente já tem acesso ao sistema.</p>') + "</div>";
    }

    K.paginas.clientes = {
        titulo: "Clientes",

        render: function (el) {
            var admin = S.pode("admin");
            var dados = [];

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Cadastros</p><h1><em>Clientes</em></h1></div>' +
                (admin ? '<div class="head-acts"><button class="btn" id="novo" type="button">' + K.ui.icone("M12 5v14M5 12h14") + " Novo cliente</button></div>" : "") + "</div>" +
                '<section class="card tbl-wrap rise" style="--i:1"><div id="lista">' + K.ui.carregando(5) + "</div></section>";

            var lista = el.querySelector("#lista");

            function pintar() {
                if (!dados.length) {
                    lista.innerHTML = K.ui.vazio("Nenhum cliente cadastrado", admin ? "Cadastre a primeira loja para começar a criar entregas." : "O administrador ainda não cadastrou clientes.", admin ? '<button class="btn" data-novo type="button">Novo cliente</button>' : "", "usuarios");
                    return;
                }

                lista.innerHTML = '<table class="tbl"><thead><tr><th>Cliente</th><th>CPF/CNPJ</th><th>Contato</th><th class="num">Entregas</th><th></th></tr></thead><tbody>' + dados.map(function (c) {
                    return '<tr data-id="' + c.id + '"><td data-l="Cliente" class="full"><span class="strong">' + esc(c.nome) + "</span>" + (c.usuario_id ? ' <span class="tag ok">Com acesso</span>' : "") + "</td>" +
                        '<td data-l="CPF/CNPJ">' + (c.cpf_cnpj ? esc(K.fmt.mascarar(c.cpf_cnpj)) : "—") + '</td><td data-l="Contato">' + esc(c.email || "—") + '<span class="sub">' + esc(c.telefone || "") + "</span></td>" +
                        '<td data-l="Entregas" class="num">' + c.entregas + '</td><td class="acts-c"><div class="acts"><button class="ib" data-ver type="button" aria-label="Ver ' + esc(c.nome) + '"><svg viewBox="0 0 24 24"><path d="' + ICO_VER + '"/></svg></button>' +
                        (admin ? '<button class="ib" data-edit type="button" aria-label="Editar ' + esc(c.nome) + '"><svg viewBox="0 0 24 24"><path d="' + ICO_EDIT + '"/></svg></button>' : "") + "</div></td></tr>";
                }).join("") + "</tbody></table>";
            }

            function carregar() {
                return K.api.clientes.listar().then(function (l) {
                    dados = l;
                    pintar();
                }).catch(function (e) {
                    lista.innerHTML = K.ui.falha(e, true);
                });
            }

            function detalhe(c) {
                var m = K.ui.modal({
                    titulo: c.nome,
                    largo: true,
                    cancelar: "Fechar",
                    ok: admin ? "Editar" : false,
                    html: '<dl class="dados">' + dado("CPF/CNPJ", c.cpf_cnpj) + dado("Telefone", c.telefone) + dado("E-mail", c.email) + dado("Endereço", c.endereco) +
                        dado("Cliente desde", K.fmt.data(c.data_cadastro)) + dado("Acesso ao sistema", c.usuario_id ? "Sim" : "Não") + '</dl><h3 class="sub-h">Últimas entregas</h3><div id="ult">' + K.ui.carregando(2) + '</div><h3 class="sub-h">Integrações de API</h3><div id="integ">' + K.ui.carregando(1) + "</div>",
                    aoOk: function (f, v, api) {
                        api.fechar();
                        editar(c);

                        return false;
                    }
                });

                K.api.clientes.ultimasEntregas(c.id).then(function (l) {
                    m.el.querySelector("#ult").innerHTML = l.length ? '<ul class="mini-l">' + l.map(function (e) {
                        return '<li><a href="#/entregas/' + esc(e.codigo_rastreamento) + '" data-fechar><b class="code">' + esc(e.codigo_rastreamento) + "</b><span>" + esc(e.nome_destinatario) + "</span>" + K.status.chip(e.status) + "</a></li>";
                    }).join("") + "</ul>" : '<p class="mudo">Nenhuma entrega ainda.</p>';
                });

                K.api.clientes.integracoes(c.id).then(function (l) {
                    m.el.querySelector("#integ").innerHTML = l.length ? '<ul class="mini-l">' + l.map(function (i) {
                        return "<li><span><b>" + esc(i.nome) + '</b></span><span class="tag ' + (i.status === "ativa" ? "ok" : "nodrv") + '">' + (i.status === "ativa" ? "Ativa" : "Inativa") + "</span></li>";
                    }).join("") + "</ul>" : '<p class="mudo">Nenhuma integração criada.</p>';
                });
            }

            function editar(c) {
                K.ui.modal({
                    titulo: c ? "Editar cliente" : "Novo cliente",
                    html: formulario(c),
                    ok: c ? "Salvar" : "Cadastrar",
                    aoAbrir: function (f) {
                        var ck = f.querySelector("#ck-acesso");

                        if (ck) {
                            ck.addEventListener("change", function () {
                                f.querySelector("#bloco-acesso").hidden = !ck.checked;
                            });
                        }
                    },
                    aoOk: function (f, v) {
                        var comAcesso = !!v.acesso;
                        var erros = validar(v, comAcesso);
                        var chaves = Object.keys(erros);

                        f.querySelectorAll(".field.erro").forEach(function (x) { x.classList.remove("erro"); });
                        f.querySelectorAll(".field .msg").forEach(function (x) { x.remove(); });

                        if (chaves.length) {
                            chaves.forEach(function (k) { K.ui.marcarErro(f.elements[k], erros[k]); });
                            f.elements[chaves[0]].focus();
                            throw new Error("Confira os campos destacados.");
                        }

                        return K.api.clientes.salvar(c && c.id, v).then(function (r) {
                            if (!comAcesso) {
                                return null;
                            }

                            return K.api.usuarios.criar({ email: v.email, senha: v.senha, nome: v.nome, perfil: "cliente", cliente_id: r.id }).catch(function (err) {
                                K.aviso("Cliente salvo, mas sem acesso", err.message, "erro");
                            });
                        }).then(function () {
                            K.aviso(c ? "Cliente atualizado" : "Cliente cadastrado", v.nome);
                            return carregar();
                        });
                    }
                });
            }

            el.addEventListener("click", function (e) {
                var tr = e.target.closest("tr[data-id]");
                var c = tr && dados.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0];

                if (e.target.closest("#novo, [data-novo]")) {
                    editar(null);
                } else if (e.target.closest("[data-edit]") && c) {
                    editar(c);
                } else if (tr && c && !e.target.closest("a")) {
                    detalhe(c);
                } else if (e.target.closest("[data-tentar]")) {
                    carregar();
                }
            });

            return carregar();
        }
    };

})(window.Korven);
