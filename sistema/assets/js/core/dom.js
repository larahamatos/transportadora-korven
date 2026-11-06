//utilitários de DOM e SVG usados por todas as páginas do sistema interno

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var NS = "http://www.w3.org/2000/svg";

    K.dom = {
        // preferências do usuário
        reduce: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        fine: window.matchMedia("(hover: hover) and (pointer: fine)").matches,

        $: function (id) {
            return document.getElementById(id);
        },

        // cria elemento SVG já com atributos e pai
        mk: function (tag, attrs, parent) {
            var n = document.createElementNS(NS, tag);

            for (var k in attrs) {
                if (attrs.hasOwnProperty(k)) {
                    n.setAttribute(k, attrs[k]);
                }
            }

            if (parent) {
                parent.appendChild(n);
            }

            return n;
        },

        esc: function (s) {
            return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
                return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c];
            });
        },

        // escreve atributo só quando muda (evita invalidar o SVG à toa)
        put: function (el, k, v) {
            var c = el.__c || (el.__c = {});

            if (c[k] === v) {
                return;
            }

            c[k] = v;
            el.setAttribute(k, v);
        },

        // escreve texto só quando muda
        txt: function (el, v) {
            if (el.__t !== v) {
                el.__t = v;
                el.textContent = v;
            }
        },

        clamp: function (v, a, b) {
            return v < a ? a : v > b ? b : v;
        },

        r1: function (n) {
            return Math.round(n * 10) / 10;
        },

        ease: function (t) {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        }
    };

})(window.Korven);
