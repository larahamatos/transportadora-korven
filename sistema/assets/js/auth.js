// Sessão do usuário no navegador (Korven.auth).
// "Manter conectado" grava em localStorage; sem ele, a sessão morre ao fechar a aba (sessionStorage).
// Aviso: isto só controla a navegação. A proteção real dos dados é do banco (RLS), como diz docs/telas-do-sistema.md.

window.Korven = window.Korven || {};

(function () {
    var CHAVE = "korven.sessao";

    // Para onde cada perfil vai depois de entrar.
    var INICIO = {
        admin: "#/painel",
        operador: "#/painel",
        cliente: "#/painel",
        motorista: "#/entregas"
    };

    // Cada perfil tem o seu shell (estrutura de tela).
    var PAGINA = {
        admin: "app.html",
        operador: "app.html",
        cliente: "cliente.html",
        motorista: "motorista.html"
    };

    function ler(storage) {
        try {
            var bruto = storage.getItem(CHAVE);
            var s = bruto ? JSON.parse(bruto) : null;

            return s && s.usuario && INICIO[s.usuario.perfil_acesso] ? s : null;
        } catch (e) {
            return null;
        }
    }

    function limpar() {
        try {
            localStorage.removeItem(CHAVE);
            sessionStorage.removeItem(CHAVE);
        } catch (e) {}
    }

    Korven.auth = {
        usuario: function () {
            var s = ler(sessionStorage) || ler(localStorage);

            return s ? s.usuario : null;
        },

        inicioPara: function (perfil) {
            return INICIO[perfil] || "#/painel";
        },

        // Página + tela inicial do perfil, ex.: "motorista.html#/entregas".
        destino: function (perfil) {
            return (PAGINA[perfil] || "app.html") + Korven.auth.inicioPara(perfil);
        },

        entrar: function (email, senha, manter) {
            return Korven.api.entrar(email, senha).then(function (usuario) {
                limpar();

                try {
                    (manter ? localStorage : sessionStorage).setItem(CHAVE, JSON.stringify({ usuario: usuario }));
                } catch (e) {
                    throw new Error("Seu navegador bloqueou o armazenamento. Libere-o para entrar.");
                }

                return usuario;
            });
        },

        sair: function () {
            limpar();

            return Korven.api.sair();
        },

        // Chame no topo de páginas protegidas. Devolve o usuário; sem sessão leva ao login e,
        // se o perfil não pertence a esta página, ao shell certo. "perfis" = quem pode usar a página.
        exigir: function (perfis) {
            var u = Korven.auth.usuario();

            if (!u) {
                location.replace("login.html");
                return null;
            }

            if (perfis && perfis.indexOf(u.perfil_acesso) === -1) {
                location.replace(Korven.auth.destino(u.perfil_acesso));
                return null;
            }

            return u;
        }
    };
})();
