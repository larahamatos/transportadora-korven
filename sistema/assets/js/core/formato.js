//formatação de datas, números e nomes (pt-BR)

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var HR = 36e5;

    function pad(n) {
        return n < 10 ? "0" + n : "" + n;
    }

    K.fmt = {
        HR: HR,

        pad: pad,

        num: function (n) {
            return n.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
        },

        // 24/10 · 13:18
        dataHora: function (d) {
            return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes());
        },

        // 2h 05min · 35min · 1d 4h
        duracao: function (ms) {
            var m = Math.round(Math.abs(ms) / 6e4);

            if (m < 60) {
                return m + "min";
            }

            if (m < 2880) {
                return Math.floor(m / 60) + "h " + pad(m % 60) + "min";
            }

            return Math.floor(m / 1440) + "d " + Math.floor((m % 1440) / 60) + "h";
        },

        iniciais: function (nome) {
            var p = String(nome || "?").trim().split(/\s+/);

            return (p[0].charAt(0) + (p.length > 1 ? p[p.length - 1].charAt(0) : "")).toUpperCase();
        },

        // R$ 1.234,50
        moeda: function (n) {
            return Number(n || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
        },

        // 24/10/2026
        data: function (d) {
            d = d instanceof Date ? d : new Date(d);

            return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear();
        },

        // 2026-10-24 (valor de <input type="date">), no fuso local
        isoDia: function (d) {
            return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
        },

        // "há 3h 10min" / "em 2h" a partir de uma data
        relativo: function (d) {
            var dif = new Date(d).getTime() - Date.now();

            return (dif < 0 ? "há " : "em ") + K.fmt.duracao(dif);
        },

        // situação no prazo / atrasada
        situacao: function (prevista, conclusao) {
            prevista = new Date(prevista).getTime();

            if (conclusao) {
                var dif = prevista - new Date(conclusao).getTime();

                return dif >= 0
                    ? { tipo: "ok", texto: "Entregue no prazo" }
                    : { tipo: "late", texto: "Entregue com " + K.fmt.duracao(dif) + " de atraso" };
            }

            var resta = prevista - Date.now();

            return resta >= 0
                ? { tipo: "ok", texto: "No prazo · faltam " + K.fmt.duracao(resta) }
                : { tipo: "late", texto: "Atrasada há " + K.fmt.duracao(resta) };
        },

        digitos: function (s) {
            return String(s || "").replace(/\D/g, "");
        },

        // 123.456.789-00 ou 12.345.678/0001-90
        cpfCnpj: function (s) {
            var d = K.fmt.digitos(s).slice(0, 14);

            if (d.length <= 11) {
                return d.replace(/^(\d{3})(\d)/, "$1.$2").replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1-$2");
            }

            return d.replace(/^(\d{2})(\d)/, "$1.$2").replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3").replace(/\.(\d{3})(\d)/, ".$1/$2").replace(/(\d{4})(\d)/, "$1-$2");
        },

        // oculta os dígitos, deixando só os 4 últimos
        mascarar: function (s) {
            var t = String(s || "");
            var total = K.fmt.digitos(t).length;
            var visiveis = 4;

            return t.replace(/\d/g, function (c) {
                return total-- > visiveis ? "•" : c;
            });
        },

        // (51) 99999-8888
        telefone: function (s) {
            var d = K.fmt.digitos(s).slice(0, 11);

            if (d.length <= 2) {
                return d.length ? "(" + d : "";
            }

            if (d.length <= 6) {
                return "(" + d.slice(0, 2) + ") " + d.slice(2);
            }

            if (d.length <= 10) {
                return "(" + d.slice(0, 2) + ") " + d.slice(2, 6) + "-" + d.slice(6);
            }

            return "(" + d.slice(0, 2) + ") " + d.slice(2, 7) + "-" + d.slice(7);
        }
    };

})(window.Korven);
