//menu lateral (desktop) e barra inferior (celular), montados conforme o perfil

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var I = {
        painel: "M4 13h6V4H4zM14 20h6V11h-6zM14 8h6V4h-6zM4 20h6v-3H4z",
        entregas: "M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10",
        clientes: "M3 21h18M5 21V8l7-4 7 4v13M9 21v-6h6v6M9 11h.01M15 11h.01",
        motoristas: "M3 6h11v10H3zM14 9h4l3 3v4h-7M7.5 19.2a1.6 1.6 0 1 0 0-.01M17.5 19.2a1.6 1.6 0 1 0 0-.01",
        usuarios: "M9 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zM3 20c0-3.4 2.7-6 6-6s6 2.6 6 6M16 5.2a3.2 3.2 0 0 1 0 5.8M17.5 14.4c2 .7 3.5 2.6 3.5 5.6",
        integracoes: "M8 8l-5 4 5 4M16 8l5 4-5 4M14 5l-4 14",
        relatorios: "M4 20v-9M10 20V4M16 20v-7M21 20H3",
        perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-4 3.6-7 8-7s8 3 8 7",
        sair: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9"
    };

    var ITENS = {
        painel: { rotulo: "Painel", hash: "#/painel" },
        entregas: { rotulo: "Entregas", hash: "#/entregas" },
        minhas: { rotulo: "Minhas entregas", curto: "Entregas", hash: "#/entregas", icone: "entregas" },
        clientes: { rotulo: "Clientes", hash: "#/clientes" },
        motoristas: { rotulo: "Motoristas", hash: "#/motoristas" },
        integracoes: { rotulo: "Integrações de API", curto: "API", hash: "#/integracoes" },
        usuarios: { rotulo: "Usuários", hash: "#/usuarios" },
        relatorios: { rotulo: "Relatórios", curto: "Relatórios", hash: "#/relatorios" },
        perfil: { rotulo: "Meu perfil", curto: "Perfil", hash: "#/perfil" }
    };

    var POR_PERFIL = {
        admin: ["painel", "entregas", "clientes", "motoristas", "integracoes", "usuarios", "relatorios"],
        operador: ["painel", "entregas", "clientes", "motoristas"],
        motorista: ["minhas", "perfil"],
        cliente: ["painel", "entregas", "integracoes"]
    };

    function icone(nome) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + I[nome] + '"/></svg>';
    }

    K.menu = {
        icone: icone,
        icones: I,

        // chave do item para uma rota (ex.: "entregas/nova" -> "entregas")
        ativoDe: function (rota) {
            var base = String(rota || "").split("/")[0];

            return base === "entregas" && K.sessao.perfil === "motorista" ? "minhas" : base;
        },

        // preenche <nav> lateral e barra inferior; base = prefixo do link (ex.: "index.html" fora do app)
        montar: function (nav, tabbar, ativo, base) {
            var itens = POR_PERFIL[K.sessao.perfil] || [];

            base = base || "";

            nav.innerHTML = itens.map(function (k) {
                var it = ITENS[k];

                return '<a href="' + base + it.hash + '" data-tip="' + it.rotulo + '"' + (k === ativo ? ' class="on" aria-current="page"' : "") + ">" + icone(it.icone || k) + "</a>";
            }).join("");

            if (tabbar) {
                tabbar.innerHTML = itens.map(function (k) {
                    var it = ITENS[k];

                    return '<a href="' + base + it.hash + '"' + (k === ativo ? ' class="on" aria-current="page"' : "") + ">" + icone(it.icone || k) + "<span>" + (it.curto || it.rotulo) + "</span></a>";
                }).join("");
            }
        },

        // rotas permitidas para o perfil atual
        permite: function (rota) {
            var base = String(rota || "").split("/")[0];

            if (base === "perfil") {
                return true;
            }

            if (base === "entregas") {
                return K.sessao.perfil !== null;
            }

            var chave = base;

            return (POR_PERFIL[K.sessao.perfil] || []).indexOf(chave) >= 0;
        }
    };

})(window.Korven);
