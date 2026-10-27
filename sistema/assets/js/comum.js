// Partes compartilhadas pelos três shells (admin/operador, motorista, cliente):
// menu do usuário, saudação e o roteador por hash. As telas são as mesmas em todos (Korven.views).

window.Korven = window.Korven || {};

(function () {
    var $ = function (id) {
        return document.getElementById(id);
    };

    Korven.ui = {
        iniciais: function (nome) {
            var p = nome.trim().split(/\s+/);

            return ((p[0] || "")[0] + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
        },

        primeiroNome: function (nome) {
            return nome.trim().split(/\s+/)[0];
        },

        saudacao: function () {
            var h = new Date().getHours();

            return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
        },

        // Liga o chip do usuário. Espera no HTML: #user-btn, #user-menu, #avatar, #um-perfil, #sair
        // (e, opcionais, #user-nome e #user-perfil).
        ligarUsuario: function (usuario) {
            var btn = $("user-btn");
            var menu = $("user-menu");

            $("avatar").textContent = Korven.ui.iniciais(usuario.nome);
            $("um-perfil").innerHTML = Korven.icon("perfil") + "<span>Meu perfil</span>";
            $("sair").innerHTML = Korven.icon("sair") + "<span>Sair</span>";

            if ($("user-nome")) {
                $("user-nome").textContent = usuario.nome;
            }

            if ($("user-perfil")) {
                $("user-perfil").textContent = Korven.perfis[usuario.perfil_acesso];
            }

            function abrir(sim) {
                menu.hidden = !sim;
                btn.setAttribute("aria-expanded", String(sim));
            }

            btn.addEventListener("click", function (e) {
                e.stopPropagation();
                abrir(menu.hidden);
            });

            menu.addEventListener("click", function () {
                abrir(false);
            });

            document.addEventListener("click", function () {
                abrir(false);
            });

            document.addEventListener("keydown", function (e) {
                if (e.key === "Escape") {
                    abrir(false);
                }
            });

            $("sair").addEventListener("click", function () {
                Korven.auth.sair().then(function () {
                    location.replace("login.html");
                });
            });
        }
    };

    // Roteador por hash (#/painel). Resolve a rota, confere o perfil, desenha a view e avisa o shell.
    //   opcoes.view      elemento onde a tela é desenhada
    //   opcoes.usuario   usuário logado
    //   opcoes.aoTrocar  function (rota, titulo): atualiza menu, título etc. "rota" é null em erro.
    Korven.router = {
        iniciar: function (opcoes) {
            var perfil = opcoes.usuario.perfil_acesso;
            var view = opcoes.view;
            var limpar = null;

            function renderizar() {
                var id = location.hash.replace(/^#\/?/, "").replace(/\/$/, "");

                // Sem rota: vai para o início do perfil.
                if (!id) {
                    location.replace(Korven.auth.inicioPara(perfil));
                    return;
                }

                var rota = Korven.rota(id);
                var nome = "_naoEncontrado";
                var titulo = "Não encontrada";

                if (rota && !Korven.podeAcessar(rota, perfil)) {
                    nome = "_negado";
                    titulo = "Sem acesso";
                    rota = null;
                } else if (rota) {
                    nome = Korven.views[rota.id] ? rota.id : "_pendente";
                    titulo = Korven.rotuloMenu(rota, perfil);
                }

                if (limpar) {
                    limpar();
                    limpar = null;
                }

                view.innerHTML = "";
                // Reinicia a animação de entrada a cada troca de tela.
                view.classList.remove("entra");
                void view.offsetWidth;
                view.classList.add("entra");

                limpar = Korven.views[nome](view, { usuario: opcoes.usuario, perfil: perfil, rota: rota }) || null;

                document.title = titulo + " — Korven";
                opcoes.aoTrocar(rota, titulo);
                window.scrollTo(0, 0);
                view.focus({ preventScroll: true });
            }

            window.addEventListener("hashchange", renderizar);
            renderizar();
        }
    };
})();
