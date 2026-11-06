//integrações de API: chaves das lojas para criar entregas pela API. O segredo aparece uma única vez.

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;

    // mostra o segredo recém-criado; depois disso ele não pode mais ser visto
    function mostrarSegredo(cred, titulo) {
        var token = cred.chave_identificacao + "." + cred.segredo;

        K.ui.modal({
            titulo: titulo,
            largo: true,
            cancelar: false,
            ok: "Já guardei",
            html: '<div class="aviso-box" style="margin-bottom:14px">Copie agora. Por segurança, o segredo não será exibido de novo (guardamos só o hash). Se perder, gere outro.</div>' +
                '<div class="segredo"><div><small>Chave</small><div class="row"><code>' + esc(cred.chave_identificacao) + '</code><button class="ib" type="button" data-cp="' + esc(cred.chave_identificacao) + '" aria-label="Copiar chave"><svg viewBox="0 0 24 24"><path d="M9 9h10v11H9zM5 15V4h10"/></svg></button></div></div>' +
                '<div><small>Segredo</small><div class="row"><code>' + esc(cred.segredo) + '</code><button class="ib" type="button" data-cp="' + esc(cred.segredo) + '" aria-label="Copiar segredo"><svg viewBox="0 0 24 24"><path d="M9 9h10v11H9zM5 15V4h10"/></svg></button></div></div></div>' +
                '<p class="mini" style="margin-top:14px">Envie nas chamadas da API: <code class="mono">Authorization: Bearer ' + esc(token) + '</code></p>' +
                '<div style="margin-top:10px"><button class="btn ghost sm" type="button" data-cp="' + esc(token) + '">Copiar token completo</button></div>',
            aoAbrir: function (f) {
                f.addEventListener("click", function (e) {
                    var b = e.target.closest("[data-cp]");

                    if (b) {
                        K.ui.copiar(b.getAttribute("data-cp"));
                    }
                });
            }
        });
    }

    K.paginas.integracoes = {
        titulo: "Integrações de API",

        render: function (el) {
            var admin = S.pode("admin");
            var dados = [];

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Para a sua loja</p><h1>Integrações <em>de API</em></h1></div>' +
                '<div class="head-acts"><a class="btn ghost" href="' + K.config.docsApi + '" target="_blank" rel="noopener">Documentação da API</a><button class="btn" id="novo" type="button">' + K.ui.icone("M12 5v14M5 12h14") + " Nova integração</button></div></div>" +
                '<div id="lista" class="integ-grid">' + K.ui.carregando(3) + "</div>";

            var lista = el.querySelector("#lista");

            function pintar() {
                if (!dados.length) {
                    lista.innerHTML = '<section class="card" style="grid-column:1/-1">' + K.ui.vazio("Nenhuma integração ainda", "Crie uma chave para sua loja enviar pedidos e consultar entregas pela API da Korven.", '<button class="btn" data-novo type="button">Nova integração</button>', "chave") + "</section>";
                    return;
                }

                lista.innerHTML = dados.map(function (i, k) {
                    var ativa = i.status === "ativa";

                    return '<article class="card integ rise' + (ativa ? "" : " off") + '" style="--i:' + k + '" data-id="' + i.id + '"><header><div><h3>' + esc(i.nome) + "</h3>" + (admin && i.cliente ? "<small>" + esc(i.cliente.nome) + "</small>" : "") + "</div>" +
                        '<span class="tag ' + (ativa ? "ok" : "nodrv") + '"><i class="dot"></i>' + (ativa ? "Ativa" : "Inativa") + "</span></header>" +
                        '<div class="integ-k"><small>Chave</small><div class="row"><code class="mono">' + esc(i.chave_identificacao) + '</code><button class="ib" type="button" data-cp aria-label="Copiar chave"><svg viewBox="0 0 24 24"><path d="M9 9h10v11H9zM5 15V4h10"/></svg></button></div></div>' +
                        '<dl class="dados um"><div class="dado"><dt>Criada em</dt><dd>' + K.fmt.data(i.data_criacao) + '</dd></div><div class="dado"><dt>Último uso</dt><dd>' + (i.data_ultima_utilizacao ? K.fmt.dataHora(new Date(i.data_ultima_utilizacao)) : "Nunca") + "</dd></div></dl>" +
                        '<footer><button class="btn ghost sm" data-toggle type="button">' + (ativa ? "Desativar" : "Ativar") + '</button><button class="btn ghost sm" data-novo-seg type="button">Gerar novo segredo</button></footer></article>';
                }).join("");
            }

            function carregar() {
                return K.api.integracoes.listar().then(function (l) {
                    dados = l;
                    pintar();
                }).catch(function (e) {
                    lista.innerHTML = '<section class="card" style="grid-column:1/-1">' + K.ui.falha(e, true) + "</section>";
                });
            }

            function criar() {
                K.ui.modal({
                    titulo: "Nova integração",
                    html: '<div class="form">' + (admin ? K.ui.campo({ id: "cliente", rotulo: "Cliente", tipo: "select", req: true, opcoes: [["", "Carregando…"]] }) : "") +
                        K.ui.campo({ id: "nome", rotulo: "Nome da integração", req: true, placeholder: "Ex.: Loja online", attrs: 'maxlength="60"' }) + "</div>",
                    ok: "Criar integração",
                    aoAbrir: function (f) {
                        if (admin) {
                            K.api.clientes.opcoes().then(function (l) {
                                f.elements.cliente.innerHTML = '<option value="">Escolha o cliente…</option>' + l.map(function (c) { return '<option value="' + c.id + '">' + esc(c.nome) + "</option>"; }).join("");
                            });
                        }
                    },
                    aoOk: function (f, v) {
                        if (admin && !v.cliente) { throw new Error("Escolha o cliente."); }
                        if (!v.nome) { throw new Error("Dê um nome à integração."); }

                        return K.api.integracoes.criar(v.cliente, v.nome).then(function (cred) {
                            carregar();
                            setTimeout(function () { mostrarSegredo(cred, "Integração criada"); }, 200);
                        });
                    }
                });
            }

            el.addEventListener("click", function (e) {
                var card = e.target.closest("[data-id]");
                var i = card && dados.filter(function (x) { return x.id === card.getAttribute("data-id"); })[0];

                if (e.target.closest("#novo, [data-novo]")) {
                    criar();
                } else if (e.target.closest("[data-cp]") && i) {
                    K.ui.copiar(i.chave_identificacao, "Chave copiada");
                } else if (e.target.closest("[data-toggle]") && i) {
                    var novo = i.status === "ativa" ? "inativa" : "ativa";
                    var go = novo === "inativa" ? K.ui.confirmar("Desativar integração?", "A loja " + (i.cliente ? i.cliente.nome : "") + " deixará de conseguir usar a API com essa chave até você ativar de novo.", "Desativar", true) : Promise.resolve(true);

                    go.then(function (sim) {
                        if (sim) {
                            return K.api.integracoes.status(i.id, novo).then(function () {
                                K.aviso(novo === "ativa" ? "Integração ativada" : "Integração desativada", i.nome);
                                return carregar();
                            });
                        }
                    }).catch(function (err) {
                        K.aviso("Não foi possível alterar", err.message, "erro");
                    });
                } else if (e.target.closest("[data-novo-seg]") && i) {
                    K.ui.confirmar("Gerar novo segredo?", "O segredo atual deixa de funcionar na hora. Atualize a loja com o novo valor.", "Gerar novo segredo", true).then(function (sim) {
                        if (sim) {
                            return K.api.integracoes.novoSegredo(i.id).then(function (cred) {
                                mostrarSegredo(cred, "Novo segredo gerado");
                            });
                        }
                    }).catch(function (err) {
                        K.aviso("Não foi possível gerar", err.message, "erro");
                    });
                } else if (e.target.closest("[data-tentar]")) {
                    carregar();
                }
            });

            return carregar();
        }
    };

})(window.Korven);
