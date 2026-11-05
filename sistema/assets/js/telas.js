// Telas em arquivos separados. Cada tela mora em assets/views/<id>/ com 3 arquivos de mesmo nome:
//   <id>.html  estrutura      <id>.css  estilo      <id>.js  comportamento
// (rota "entregas/nova" → pasta "entregas-nova"). Não precisa de <script> nos shells nem de config na rota:
// se a rota não tem tela inline em Korven.views, o roteador busca a pasta pelo id.
//
// No <id>.js use o helper:
//   Korven.view("<id>", function (container, ctx) {
//       // container já contém o <id>.html; ctx = { usuario, perfil, rota }
//       return function () { /* limpeza opcional ao sair da tela */ };
//   });
// Precisa de servidor (fetch), não de file://.

window.Korven = window.Korven || {};
Korven.telas = Korven.telas || {};

// Helper: registra o comportamento de uma tela.
Korven.view = function (id, iniciar) {
    Korven.telas[id] = iniciar;
};

(function () {
    var cache = {};

    function pegar(url) {
        return fetch(url).then(function (r) {
            if (!r.ok) {
                throw new Error("Não foi possível carregar " + url);
            }
            return r.text();
        });
    }

    function css(url) {
        return new Promise(function (ok) {
            var l = document.createElement("link");

            l.rel = "stylesheet";
            l.href = url;
            l.onload = l.onerror = ok; // CSS ausente não derruba a tela
            document.head.appendChild(l);
        });
    }

    function js(url) {
        return new Promise(function (ok) {
            var s = document.createElement("script");

            s.src = url;
            s.onload = s.onerror = ok; // JS ausente = tela só com HTML
            document.head.appendChild(s);
        });
    }

    // Devolve Promise de { html, iniciar }. Rejeita se o .html não existe (tela ainda não construída).
    Korven.carregarTela = function (id) {
        if (!cache[id]) {
            var nome = id.replace(/\//g, "-");
            var base = "assets/views/" + nome + "/" + nome;

            cache[id] = pegar(base + ".html").then(function (html) {
                return Promise.all([css(base + ".css"), js(base + ".js")]).then(function () {
                    return { html: html, iniciar: Korven.telas[id] || null };
                });
            }).catch(function (e) {
                delete cache[id];
                throw e;
            });
        }

        return cache[id];
    };
})();
