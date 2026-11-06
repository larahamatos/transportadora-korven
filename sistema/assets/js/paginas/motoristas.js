//motoristas: lista para admin e operador; só o admin cria e edita (e libera o login do motorista)

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;
    var EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    var ICO_EDIT = "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4";

    function validar(v, comAcesso) {
        var e = {};
        var cpf = K.fmt.digitos(v.cpf).length;
        var cnh = K.fmt.digitos(v.cnh).length;
        var tel = K.fmt.digitos(v.telefone).length;

        if (v.nome.length < 2) { e.nome = "Informe o nome."; }
        if (v.cpf && cpf !== 11) { e.cpf = "CPF tem 11 dígitos."; }
        if (v.cnh && cnh !== 11) { e.cnh = "A CNH tem 11 dígitos."; }
        if (v.email && !EMAIL.test(v.email)) { e.email = "E-mail inválido."; }
        if (v.telefone && tel !== 10 && tel !== 11) { e.telefone = "Informe DDD + número."; }

        if (comAcesso) {
            if (!v.email) { e.email = "O e-mail será o login do motorista."; }
            if (!v.senha || v.senha.length < 8) { e.senha = "Mínimo de 8 caracteres."; }
        }

        return e;
    }

    function formulario(m) {
        var semAcesso = !m || !m.usuario_id;

        m = m || {};

        return '<div class="form">' + K.ui.campo({ id: "nome", rotulo: "Nome", valor: m.nome, req: true, attrs: 'maxlength="120"' }) +
            '<div class="grid2">' + K.ui.campo({ id: "cpf", rotulo: "CPF", valor: m.cpf, attrs: 'data-mask="doc" inputmode="numeric"' }) +
            K.ui.campo({ id: "cnh", rotulo: "CNH", valor: m.cnh, attrs: 'inputmode="numeric" maxlength="11"' }) +
            K.ui.campo({ id: "telefone", rotulo: "Telefone", valor: m.telefone, attrs: 'data-mask="tel" inputmode="tel"' }) +
            K.ui.campo({ id: "disponibilidade", rotulo: "Disponibilidade", tipo: "select", valor: m.disponibilidade || "disponivel", opcoes: [["disponivel", "Disponível"], ["em_entrega", "Em entrega"], ["indisponivel", "Indisponível"]], ajuda: "\"Em entrega\" é ajustado sozinho conforme as cargas." }) + "</div>" +
            K.ui.campo({ id: "email", rotulo: "E-mail", tipo: "email", valor: m.email, attrs: 'maxlength="120" autocomplete="off"' }) +
            (semAcesso ? '<label class="check"><input type="checkbox" name="acesso" id="ck-acesso"> Criar acesso ao sistema para este motorista</label><div id="bloco-acesso" hidden>' +
                K.ui.campo({ id: "senha", rotulo: "Senha inicial", tipo: "password", ajuda: "O login é o e-mail acima.", attrs: 'autocomplete="new-password" minlength="8"' }) + "</div>" : '<p class="aviso-ok">Este motorista já tem acesso ao sistema.</p>') + "</div>";
    }

    K.paginas.motoristas = {
        titulo: "Motoristas",

        render: function (el) {
            var admin = S.pode("admin");
            var dados = [];

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Cadastros</p><h1><em>Motoristas</em></h1></div>' +
                (admin ? '<div class="head-acts"><button class="btn" id="novo" type="button">' + K.ui.icone("M12 5v14M5 12h14") + " Novo motorista</button></div>" : "") + "</div>" +
                '<section class="card tbl-wrap rise" style="--i:1"><div id="lista">' + K.ui.carregando(4) + "</div></section>";

            var lista = el.querySelector("#lista");

            function pintar() {
                if (!dados.length) {
                    lista.innerHTML = K.ui.vazio("Nenhum motorista cadastrado", admin ? "Cadastre a equipe de rota para poder atribuir entregas." : "O administrador ainda não cadastrou motoristas.", admin ? '<button class="btn" data-novo type="button">Novo motorista</button>' : "", "usuarios");
                    return;
                }

                lista.innerHTML = '<table class="tbl"><thead><tr><th>Motorista</th><th>Telefone</th><th>Documentos</th><th>Disponibilidade</th><th class="num">Em andamento</th>' + (admin ? "<th></th>" : "") + "</tr></thead><tbody>" + dados.map(function (m) {
                    return '<tr data-id="' + m.id + '"><td data-l="Motorista" class="full"><span class="strong">' + esc(m.nome) + "</span>" + (m.usuario_id ? ' <span class="tag ok">Com acesso</span>' : "") + '<span class="sub">' + esc(m.email || "") + "</span></td>" +
                        '<td data-l="Telefone">' + esc(m.telefone || "—") + '</td><td data-l="CPF · CNH"><span class="sub" style="color:var(--soft)">' + (m.cpf ? esc(K.fmt.mascarar(m.cpf)) : "—") + "</span><span class=\"sub\">CNH " + (m.cnh ? esc(K.fmt.mascarar(m.cnh)) : "—") + "</span></td>" +
                        '<td data-l="Disponibilidade">' + K.status.dispChip(m.disponibilidade) + '</td><td data-l="Em andamento" class="num">' + m.andamento + "</td>" +
                        (admin ? '<td class="acts-c"><div class="acts"><button class="ib" data-edit type="button" aria-label="Editar ' + esc(m.nome) + '"><svg viewBox="0 0 24 24"><path d="' + ICO_EDIT + '"/></svg></button></div></td>' : "") + "</tr>";
                }).join("") + "</tbody></table>";
            }

            function carregar() {
                return K.api.motoristas.listar().then(function (l) {
                    dados = l;
                    pintar();
                }).catch(function (e) {
                    lista.innerHTML = K.ui.falha(e, true);
                });
            }

            function editar(m) {
                K.ui.modal({
                    titulo: m ? "Editar motorista" : "Novo motorista",
                    html: formulario(m),
                    ok: m ? "Salvar" : "Cadastrar",
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

                        return K.api.motoristas.salvar(m && m.id, v).then(function (r) {
                            if (!comAcesso) {
                                return null;
                            }

                            return K.api.usuarios.criar({ email: v.email, senha: v.senha, nome: v.nome, perfil: "motorista", motorista_id: r.id }).catch(function (err) {
                                K.aviso("Motorista salvo, mas sem acesso", err.message, "erro");
                            });
                        }).then(function () {
                            K.aviso(m ? "Motorista atualizado" : "Motorista cadastrado", v.nome);
                            return carregar();
                        });
                    }
                });
            }

            el.addEventListener("click", function (e) {
                var tr = e.target.closest("tr[data-id]");
                var m = tr && dados.filter(function (x) { return x.id === tr.getAttribute("data-id"); })[0];

                if (e.target.closest("#novo, [data-novo]")) {
                    editar(null);
                } else if (e.target.closest("[data-edit]") && m) {
                    editar(m);
                } else if (e.target.closest("[data-tentar]")) {
                    carregar();
                }
            });

            return carregar();
        }
    };

})(window.Korven);
