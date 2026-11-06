//usuários: logins do sistema (só admin). A criação passa pela Edge Function gerenciar-usuarios.

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var ICO_EDIT = "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4";
    var ICO_KEY = "M14 10a4 4 0 1 0-3.2 3.9L11 15h2v2h2v2h3v-3l-4.2-4.2";

    K.paginas.usuarios = {
        titulo: "Usuários",

        render: function (el) {
            var dados = [];

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Acesso</p><h1><em>Usuários</em></h1></div>' +
                '<div class="head-acts"><button class="btn" id="novo" type="button">' + K.ui.icone("M12 5v14M5 12h14") + " Novo usuário</button></div></div>" +
                '<section class="card tbl-wrap rise" style="--i:1"><div id="lista">' + K.ui.carregando(5) + "</div></section>";

            var lista = el.querySelector("#lista");

            function pintar() {
                lista.innerHTML = '<table class="tbl"><thead><tr><th>Usuário</th><th>Perfil</th><th>Vínculo</th><th>Cadastro</th><th></th></tr></thead><tbody>' + dados.map(function (u) {
                    return '<tr data-id="' + u.id + '"><td data-l="Usuário" class="full"><span class="strong">' + esc(u.nome) + '</span><span class="sub">' + esc(u.email) + "</span></td>" +
                        '<td data-l="Perfil"><span class="tag ' + (u.perfil_acesso === "admin" ? "ok" : "") + '">' + K.status.perfil[u.perfil_acesso] + "</span></td>" +
                        '<td data-l="Vínculo">' + esc(u.vinculo || "—") + '</td><td data-l="Cadastro">' + K.fmt.data(u.data_cadastro) + "</td>" +
                        '<td class="acts-c"><div class="acts"><button class="ib" data-edit type="button" aria-label="Editar ' + esc(u.nome) + '"><svg viewBox="0 0 24 24"><path d="' + ICO_EDIT + '"/></svg></button>' +
                        '<button class="ib" data-senha type="button" aria-label="Redefinir senha de ' + esc(u.nome) + '"><svg viewBox="0 0 24 24"><path d="' + ICO_KEY + '"/></svg></button></div></td></tr>';
                }).join("") + "</tbody></table>";
            }

            function carregar() {
                return K.api.usuarios.listar().then(function (l) {
                    dados = l;
                    pintar();
                }).catch(function (e) {
                    lista.innerHTML = K.ui.falha(e, true);
                });
            }

            function novo() {
                var livres = { cliente: [], motorista: [] };

                K.ui.modal({
                    titulo: "Novo usuário",
                    html: '<div class="form">' + K.ui.campo({ id: "nome", rotulo: "Nome", req: true, attrs: 'maxlength="80"' }) +
                        K.ui.campo({ id: "email", rotulo: "E-mail (login)", tipo: "email", req: true, attrs: 'autocomplete="off"' }) +
                        '<div class="grid2">' + K.ui.campo({ id: "senha", rotulo: "Senha inicial", tipo: "password", req: true, ajuda: "Mínimo de 8 caracteres.", attrs: 'autocomplete="new-password"' }) +
                        K.ui.campo({ id: "perfil", rotulo: "Perfil", tipo: "select", opcoes: [["operador", "Operador"], ["admin", "Administrador"], ["cliente", "Cliente"], ["motorista", "Motorista"]] }) + "</div>" +
                        '<div id="vinc" hidden>' + K.ui.campo({ id: "vinculo", rotulo: "Cadastro vinculado", tipo: "select", opcoes: [["", "Carregando…"]], ajuda: "Só aparecem cadastros que ainda não têm acesso." }) + "</div></div>",
                    ok: "Criar usuário",
                    aoAbrir: function (f) {
                        var sel = f.elements.perfil;

                        Promise.all([K.api.clientes.opcoes(), K.api.motoristas.listar()]).then(function (r) {
                            livres.cliente = r[0].filter(function (c) { return !c.usuario_id; });
                            livres.motorista = r[1].filter(function (m) { return !m.usuario_id; });
                        });

                        sel.addEventListener("change", function () {
                            var tipo = sel.value;
                            var bloco = f.querySelector("#vinc");

                            bloco.hidden = tipo !== "cliente" && tipo !== "motorista";

                            if (!bloco.hidden) {
                                var l = livres[tipo];

                                f.elements.vinculo.innerHTML = l.length ? '<option value="">Escolha…</option>' + l.map(function (x) { return '<option value="' + x.id + '">' + esc(x.nome) + "</option>"; }).join("") : '<option value="">Nenhum cadastro sem acesso</option>';
                            }
                        });
                    },
                    aoOk: function (f, v) {
                        var tipo = v.perfil === "cliente" || v.perfil === "motorista" ? v.perfil : null;

                        if (v.nome.length < 2) { throw new Error("Informe o nome."); }
                        if (!EMAIL.test(v.email)) { throw new Error("Informe um e-mail válido."); }
                        if (v.senha.length < 8) { throw new Error("A senha precisa ter ao menos 8 caracteres."); }
                        if (tipo && !v.vinculo) { throw new Error("Escolha o cadastro vinculado."); }

                        var corpo = { nome: v.nome, email: v.email, senha: v.senha, perfil: v.perfil };

                        if (tipo) {
                            corpo[tipo + "_id"] = v.vinculo;
                        }

                        return K.api.usuarios.criar(corpo).then(function () {
                            K.aviso("Usuário criado", v.nome + " já pode entrar.");
                            return carregar();
                        });
                    }
                });
            }

            function editar(u) {
                var trocaPerfil = u.perfil_acesso === "admin" || u.perfil_acesso === "operador";

                K.ui.modal({
                    titulo: "Editar usuário",
                    html: '<div class="form">' + K.ui.campo({ id: "nome", rotulo: "Nome", valor: u.nome, req: true, attrs: 'maxlength="80"' }) +
                        (trocaPerfil ? K.ui.campo({ id: "perfil", rotulo: "Perfil", tipo: "select", valor: u.perfil_acesso, opcoes: [["operador", "Operador"], ["admin", "Administrador"]], ajuda: "O sistema não deixa remover o último administrador." }) :
                            '<p class="mudo">Perfil ' + K.status.perfil[u.perfil_acesso] + " · " + esc(u.vinculo || "") + ". Muda junto com o cadastro vinculado.</p>") + "</div>",
                    aoOk: function (f, v) {
                        if (v.nome.length < 2) { throw new Error("Informe o nome."); }

                        var corpo = { nome: v.nome };

                        if (trocaPerfil) {
                            corpo.perfil = v.perfil;
                        }

                        return K.api.usuarios.atualizar(u.id, corpo).then(function () {
                            K.aviso("Usuário atualizado", v.nome);
                            return carregar();
                        });
                    }
                });
            }

            function senha(u) {
                K.ui.modal({
                    titulo: "Redefinir senha",
                    html: '<p>Defina uma nova senha para <b>' + esc(u.nome) + "</b>. Informe a senha à pessoa por um canal seguro.</p>" +
                        '<div class="form">' + K.ui.campo({ id: "senha", rotulo: "Nova senha", tipo: "password", req: true, ajuda: "Mínimo de 8 caracteres.", attrs: 'autocomplete="new-password"' }) + "</div>",
                    ok: "Redefinir",
                    aoOk: function (f, v) {
                        if (v.senha.length < 8) { throw new Error("A senha precisa ter ao menos 8 caracteres."); }

                        return K.api.usuarios.redefinirSenha(u.id, v.senha).then(function () {
                            K.aviso("Senha redefinida", u.nome);
                        });
                    }
                });
            }

            el.addEventListener("click", function (e) {
                var tr = e.target.closest("tr[data-id]");
                var u = tr && dados.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0];

                if (e.target.closest("#novo")) {
                    novo();
                } else if (e.target.closest("[data-edit]") && u) {
                    editar(u);
                } else if (e.target.closest("[data-senha]") && u) {
                    senha(u);
                } else if (e.target.closest("[data-tentar]")) {
                    carregar();
                }
            });

            return carregar();
        }
    };

})(window.Korven);
