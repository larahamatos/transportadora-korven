//meu perfil: nome, senha e (motorista) telefone e disponibilidade

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;

    K.paginas.perfil = {
        titulo: "Meu perfil",

        render: function (el) {
            var mot = S.motorista;

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Conta</p><h1>Meu <em>perfil</em></h1></div></div>' +
                '<div class="duo">' +
                '<section class="card rise form" style="--i:1"><div class="perfil-id"><span class="avatar-g">' + esc(K.fmt.iniciais(S.usuario.nome)) + "</span><div><b>" + esc(S.usuario.nome) + "</b><span>" + K.status.perfil[S.perfil] + " · " + esc(S.email) + "</span></div></div>" +
                '<form id="f-dados" class="form" novalidate>' + K.ui.campo({ id: "nome", rotulo: "Nome", valor: S.usuario.nome, req: true, attrs: 'maxlength="80"' }) +
                (mot ? K.ui.campo({ id: "telefone", rotulo: "Telefone", valor: mot.telefone, attrs: 'data-mask="tel" inputmode="tel"' }) +
                    K.ui.campo({ id: "disponibilidade", rotulo: "Disponibilidade", tipo: "select", valor: mot.disponibilidade, opcoes: mot.disponibilidade === "em_entrega" ? [["em_entrega", "Em entrega (automático)"]] : [["disponivel", "Disponível"], ["indisponivel", "Indisponível"]], ajuda: mot.disponibilidade === "em_entrega" ? "Muda sozinha quando você termina as cargas em rota." : "Indisponível tira você da lista de atribuições." }) : "") +
                '<div class="form-err" role="alert"></div><div class="form-actions"><button class="btn" type="submit">Salvar alterações</button></div></form></section>' +
                '<section class="card rise form" style="--i:2"><div class="card-h"><h2>Trocar senha</h2></div><form id="f-senha" class="form" novalidate>' +
                K.ui.campo({ id: "senha", rotulo: "Nova senha", tipo: "password", ajuda: "Mínimo de 8 caracteres.", attrs: 'autocomplete="new-password"' }) +
                K.ui.campo({ id: "conf", rotulo: "Repita a nova senha", tipo: "password", attrs: 'autocomplete="new-password"' }) +
                '<div class="form-err" role="alert"></div><div class="form-actions"><button class="btn" type="submit">Atualizar senha</button></div></form></section></div>';

            K.ui.mascaras(el);

            el.querySelector("#f-dados").addEventListener("submit", function (e) {
                e.preventDefault();

                var f = e.target;
                var v = K.ui.valores(f);
                var erro = f.querySelector(".form-err");
                var tel = K.fmt.digitos(v.telefone).length;

                erro.textContent = "";

                if (v.nome.length < 2) {
                    erro.textContent = "Informe seu nome.";
                    return;
                }

                if (mot && v.telefone && tel !== 10 && tel !== 11) {
                    erro.textContent = "Telefone: informe DDD + número.";
                    return;
                }

                K.ui.ocupado(f.querySelector("[type=submit]"), K.api.usuarios.salvarNome(S.usuario.id, v.nome).then(function () {
                    return mot ? K.api.motoristas.salvarPerfil(mot.id, v.telefone, v.disponibilidade) : null;
                })).then(function () {
                    S.usuario.nome = v.nome;

                    if (mot) {
                        mot.telefone = v.telefone;
                        mot.disponibilidade = v.disponibilidade;
                    }

                    document.getElementById("avatar").textContent = K.fmt.iniciais(v.nome);
                    el.querySelector(".perfil-id b").textContent = v.nome;
                    el.querySelector(".avatar-g").textContent = K.fmt.iniciais(v.nome);
                    K.aviso("Perfil atualizado", "Suas alterações foram salvas.");
                }).catch(function (err) {
                    erro.textContent = err.message;
                });
            });

            el.querySelector("#f-senha").addEventListener("submit", function (e) {
                e.preventDefault();

                var f = e.target;
                var v = K.ui.valores(f);
                var erro = f.querySelector(".form-err");

                erro.textContent = "";

                if (v.senha.length < 8) {
                    erro.textContent = "A senha precisa ter ao menos 8 caracteres.";
                    return;
                }

                if (v.senha !== v.conf) {
                    erro.textContent = "As senhas não conferem.";
                    return;
                }

                K.ui.ocupado(f.querySelector("[type=submit]"), K.api.usuarios.trocarSenha(v.senha)).then(function () {
                    f.reset();
                    K.aviso("Senha atualizada", "Use a nova senha no próximo login.");
                }).catch(function (err) {
                    erro.textContent = err.message;
                });
            });
        }
    };

})(window.Korven);
