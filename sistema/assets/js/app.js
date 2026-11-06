//aplicação do sistema interno: login, casca (menu/topo) e roteador por hash (#/painel, #/entregas/KV-123 ...)
//
// Cada página é registrada em K.paginas.<nome> = { titulo, render(el, ctx) } e recebe um elemento novo a cada
// navegação; respostas atrasadas de páginas já abandonadas escrevem num elemento solto e não aparecem.

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var $ = K.dom.$;
    var S = K.sessao;

    K.paginas = K.paginas || {};

    var rotaAtual = "";
    var fundoIniciado = false;

    // ---------- roteador ----------

    function ler() {
        var h = window.location.hash.replace(/^#\/?/, "");
        var partes = h.split("?");
        var query = {};

        new URLSearchParams(partes[1] || "").forEach(function (v, k) {
            query[k] = v;
        });

        return { caminho: partes[0].split("/").filter(Boolean).map(decodeURIComponent), query: query };
    }

    function escolher(caminho) {
        var base = caminho[0];

        if (base === "entregas") {
            if (caminho[1] === "nova") {
                return "nova-entrega";
            }

            return caminho[1] ? "entrega" : "entregas";
        }

        return base;
    }

    K.ir = function (hash) {
        if (window.location.hash === hash) {
            resolver();
        } else {
            window.location.hash = hash;
        }
    };

    function resolver() {
        if (!S.usuario) {
            return;
        }

        var r = ler();

        if (!r.caminho.length) {
            window.location.replace(S.home());
            return;
        }

        var base = r.caminho[0];
        var nome = escolher(r.caminho);
        var pagina = K.paginas[nome];

        if (!pagina || !K.menu.permite(base) || (nome === "nova-entrega" && S.perfil === "motorista")) {
            K.aviso(pagina ? "Sem acesso" : "Página não encontrada", pagina ? "Seu perfil não acessa esta tela." : "", "erro");
            window.location.replace(S.home());
            return;
        }

        var el = document.createElement("div");
        var page = $("page");
        var ctx = {
            caminho: r.caminho,
            query: r.query,
            crumbs: function (lista) {
                $("crumbs").innerHTML = lista.map(function (c, i) {
                    return "<li" + (i === lista.length - 1 ? ' aria-current="page"' : "") + ">" + K.dom.esc(c) + "</li>";
                }).join("");
            }
        };

        el.className = "page-body";
        ctx.crumbs([typeof pagina.titulo === "function" ? pagina.titulo(ctx) : pagina.titulo]);

        K.menu.montar($("nav"), $("tabbar"), K.menu.ativoDe(r.caminho.join("/")));

        page.innerHTML = "";
        page.appendChild(el);
        rotaAtual = r.caminho.join("/");
        document.title = (typeof pagina.titulo === "function" ? pagina.titulo(ctx) : pagina.titulo) + " · Korven";

        window.scrollTo(0, 0);

        Promise.resolve().then(function () {
            return pagina.render(el, ctx);
        }).catch(function (e) {
            el.innerHTML = '<div class="card">' + K.ui.falha(e, true) + "</div>";

            var b = el.querySelector("[data-tentar]");

            if (b) {
                b.addEventListener("click", resolver);
            }
        });
    }

    // ---------- login ----------

    function trocarForm(id) {
        ["l-entrar", "l-recuperar", "l-nova"].forEach(function (f) {
            $(f).hidden = f !== id;
        });
    }

    function mostrarLogin(msg) {
        document.body.classList.add("deslogado");
        document.title = "Entrar · Korven";
        trocarForm("l-entrar");
        $("l-erro").textContent = msg || "";
        $("l-senha").value = "";
    }

    function mostrarApp() {
        document.body.classList.remove("deslogado");

        $("avatar").textContent = K.fmt.iniciais(S.usuario.nome);
        $("avatar").title = S.usuario.nome;
        $("busca-form").hidden = false;

        if (!window.location.hash || window.location.hash === "#" || window.location.hash === "#/") {
            window.location.replace(S.home());
        }

        resolver();
    }

    function ligarLogin() {
        $("l-site").href = K.config.site;
        $("l-rastrear").href = K.config.rastreio;

        $("l-entrar").addEventListener("submit", function (e) {
            e.preventDefault();

            var email = $("l-email").value.trim();
            var senha = $("l-senha").value;
            var btn = e.target.querySelector("[type=submit]");

            $("l-erro").textContent = "";

            if (!email || !senha) {
                $("l-erro").textContent = "Informe o e-mail e a senha.";
                return;
            }

            K.ui.ocupado(btn, S.entrar(email, senha)).then(function () {
                window.location.hash = S.home();
                mostrarApp();
            }).catch(function (err) {
                $("l-erro").textContent = err.message;
            });
        });

        $("l-esqueci").addEventListener("click", function () {
            $("r-email").value = $("l-email").value;
            trocarForm("l-recuperar");
        });

        document.querySelector("[data-voltar]").addEventListener("click", function () {
            trocarForm("l-entrar");
        });

        $("l-recuperar").addEventListener("submit", function (e) {
            e.preventDefault();

            var email = $("r-email").value.trim();
            var btn = e.target.querySelector("[type=submit]");

            $("r-erro").textContent = "";

            if (!email) {
                $("r-erro").textContent = "Informe seu e-mail.";
                return;
            }

            K.ui.ocupado(btn, K.sb.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + window.location.pathname
            })).then(function (r) {
                if (r.error) {
                    throw new Error(K.erro(r.error));
                }

                trocarForm("l-entrar");
                K.aviso("Link enviado", "Se o e-mail estiver cadastrado, você receberá as instruções.");
            }).catch(function (err) {
                $("r-erro").textContent = err.message;
            });
        });

        $("l-nova").addEventListener("submit", function (e) {
            e.preventDefault();

            var senha = $("n-senha").value;
            var btn = e.target.querySelector("[type=submit]");

            $("n-erro").textContent = "";

            if (senha.length < 8) {
                $("n-erro").textContent = "A senha precisa ter ao menos 8 caracteres.";
                return;
            }

            if (senha !== $("n-conf").value) {
                $("n-erro").textContent = "As senhas não conferem.";
                return;
            }

            K.ui.ocupado(btn, K.api.usuarios.trocarSenha(senha).then(function () {
                return S.carregar();
            })).then(function (ok) {
                if (ok) {
                    K.aviso("Senha atualizada", "Você já está logado.");
                    window.location.hash = S.home();
                    mostrarApp();
                }
            }).catch(function (err) {
                $("n-erro").textContent = err.message;
            });
        });
    }

    // ---------- topo ----------

    function ligarTopo() {
        $("sair").addEventListener("click", sair);

        $("busca-form").addEventListener("submit", function (e) {
            e.preventDefault();

            var v = $("busca").value.trim();

            if (!v) {
                return;
            }

            window.location.hash = /^kv-?\d+$/i.test(v)
                ? "#/entregas/" + encodeURIComponent(v.toUpperCase().replace(/^KV(\d)/, "KV-$1"))
                : "#/entregas?busca=" + encodeURIComponent(v);

            $("busca").value = "";
            $("busca").blur();
        });

        document.addEventListener("keydown", function (e) {
            var tag = (e.target.tagName || "").toLowerCase();

            if (e.key === "/" && tag !== "input" && tag !== "textarea" && tag !== "select" && !document.body.classList.contains("deslogado")) {
                e.preventDefault();
                $("busca").focus();
            }
        });

        $("avatar").addEventListener("click", function (e) {
            e.stopPropagation();

            var aberto = document.getElementById("umenu");

            if (aberto) {
                fecharMenu();
                return;
            }

            var m = document.createElement("div");

            m.className = "umenu";
            m.id = "umenu";
            m.innerHTML = "<header><b>" + K.dom.esc(S.usuario.nome) + "</b><span>" + K.status.perfil[S.perfil] + "</span><br><small style=\"color:var(--grey)\">" + K.dom.esc(S.email) + "</small></header>" +
                '<a href="#/perfil">Meu perfil</a><button type="button" data-sair>Sair</button>';

            m.addEventListener("click", function (ev) {
                if (ev.target.closest("[data-sair]")) {
                    sair();
                }

                fecharMenu();
            });

            document.querySelector(".main").appendChild(m);
            $("avatar").setAttribute("aria-expanded", "true");
        });

        document.addEventListener("click", fecharMenu);
    }

    function fecharMenu() {
        var m = document.getElementById("umenu");

        if (m) {
            m.remove();
            $("avatar").setAttribute("aria-expanded", "false");
        }
    }

    function sair() {
        S.sair().then(function () {
            window.location.hash = "";
            mostrarLogin();
        });
    }

    // ---------- início ----------

    function iniciar() {
        K.fundo.iniciar($("bg"));
        fundoIniciado = true;

        ligarLogin();
        ligarTopo();

        window.addEventListener("hashchange", resolver);

        K.sb.auth.onAuthStateChange(function (evento) {
            if (evento === "PASSWORD_RECOVERY") {
                document.body.classList.add("deslogado");
                trocarForm("l-nova");
            }

            if (evento === "SIGNED_OUT" && S.usuario) {
                S.usuario = null;
                mostrarLogin("Sua sessão terminou. Entre novamente.");
            }
        });

        // link de recuperação de senha: o Supabase troca o token pela sessão e dispara PASSWORD_RECOVERY
        if (/type=recovery/.test(window.location.hash)) {
            return;
        }

        S.carregar().then(function (ok) {
            if (ok) {
                mostrarApp();
            } else {
                mostrarLogin();
            }
        }).catch(function (e) {
            mostrarLogin(e.message);
        });
    }

    iniciar();

})(window.Korven);
