//vocabulário do domínio: status da entrega, disponibilidade e perfis

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var ROTULO = {
        solicitada: "Solicitada",
        coletada: "Coletada",
        saiu_cd: "Saiu do CD",
        em_rodovia: "Em rodovia",
        na_cidade: "Na cidade de destino",
        saiu_entrega: "Saiu para entrega",
        entregue: "Entregue"
    };

    var PERFIL = {
        admin: "Administrador",
        operador: "Operador",
        motorista: "Motorista",
        cliente: "Cliente",
        sistema: "Sistema"
    };

    var DISP = {
        disponivel: "Disponível",
        em_entrega: "Em entrega",
        indisponivel: "Indisponível"
    };

    K.status = {
        ordem: ["solicitada", "coletada", "saiu_cd", "em_rodovia", "na_cidade", "saiu_entrega", "entregue"],
        rotulo: ROTULO,
        perfil: PERFIL,
        disp: DISP,

        chip: function (s) {
            return '<span class="st" data-st="' + s + '">' + (ROTULO[s] || s) + "</span>";
        },

        // lista de opções <option> dos status
        opcoes: function (sel) {
            return K.status.ordem.map(function (s) {
                return '<option value="' + s + '"' + (s === sel ? " selected" : "") + ">" + ROTULO[s] + "</option>";
            }).join("");
        },

        dispChip: function (d) {
            var cor = d === "disponivel" ? "ok" : d === "indisponivel" ? "nodrv" : "";

            return '<span class="tag ' + cor + '"><i class="dot"></i>' + (DISP[d] || d) + "</span>";
        }
    };

})(window.Korven);
