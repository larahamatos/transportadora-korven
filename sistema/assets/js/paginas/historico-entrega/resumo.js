//histórico de entrega: painel de resumo e lista de entregas recentes

window.Korven = window.Korven || {};
window.Korven.historico = window.Korven.historico || {};

(function (K) {
    "use strict";

    var $ = K.dom.$;
    var esc = K.dom.esc;
    var txt = K.dom.txt;
    var fmt = K.fmt;
    var ETAPAS = K.historico.ETAPAS;
    var N = ETAPAS.length;

    var passos = [];
    var foco = -1;

    function montarPassos() {
        var ol = $("rt-steps");

        ol.textContent = "";
        passos = [];

        for (var i = 0; i < N; i++) {
            var li = document.createElement("li");

            ol.appendChild(li);
            passos.push(li);
        }
    }

    K.historico.resumo = {
        // lista de entregas recentes (botões de troca)
        pintarLista: function (lista, codigoAtual) {
            var box = $("dv-list");

            box.textContent = "";

            lista.forEach(function (x) {
                var b = document.createElement("button");
                var rotulo = ETAPAS.filter(function (e) {
                    return e.status === x.status;
                })[0];

                b.type = "button";
                b.className = "dv";
                b.setAttribute("data-codigo", x.codigo_rastreamento);
                b.setAttribute("aria-pressed", x.codigo_rastreamento === codigoAtual ? "true" : "false");
                b.innerHTML = "<b>" + esc(x.codigo_rastreamento) + "</b><small>" + esc(rotulo ? rotulo.rotulo : x.status) + "</small>";

                box.appendChild(b);
            });
        },

        marcarLista: function (codigoAtual) {
            Array.prototype.forEach.call($("dv-list").querySelectorAll(".dv"), function (b) {
                b.setAttribute("aria-pressed", b.getAttribute("data-codigo") === codigoAtual ? "true" : "false");
            });
        },

        pintar: function (m) {
            var e = m.entrega;
            var chip = $("s-chip");

            txt($("s-code"), e.codigo_rastreamento);
            txt($("crumb-code"), e.codigo_rastreamento);
            txt($("s-dest"), e.nome_destinatario);
            txt($("s-ped"), e.codigo_pedido_externo ? "Pedido " + e.codigo_pedido_externo : "");

            chip.textContent = ETAPAS[m.atual].rotulo;
            chip.setAttribute("data-s", m.atual === N - 1 ? "done" : m.atual <= 2 ? "start" : "transit");

            // percurso: origem → destino, uma bolinha por status
            txt($("rt-from"), e.endereco_origem);
            txt($("rt-to"), e.endereco_destino);

            if (!passos.length) {
                montarPassos();
            }

            passos.forEach(function (li, i) {
                li.classList.toggle("on", i <= m.atual);
                li.classList.toggle("now", i === m.atual);
            });

            $("rt-line").style.setProperty("--p", (m.atual / (N - 1)).toFixed(3));
            $("rt-info").innerHTML = "Etapa <b>" + (m.atual + 1) + " de " + N + "</b> · " + esc(ETAPAS[m.atual].titulo);

            // datas
            txt($("s-sol"), fmt.dataHora(m.solicitacao));
            txt($("s-prev-l"), m.conclusao ? "Concluída em" : "Previsão");
            txt($("s-prev"), fmt.dataHora(m.conclusao || m.prevista));

            var sla = $("s-sla");

            sla.setAttribute("data-s", m.situacao.tipo);
            sla.querySelector("span").textContent = m.situacao.texto;

            // carga
            txt($("s-load"), m.totalItens + (m.totalItens === 1 ? " item · " : " itens · ") + fmt.num(m.pesoTotal) + " kg");

            $("s-items").innerHTML = m.itens.map(function (x) {
                return "<li>" + esc(x.descricao) + "<span>" + x.quantidade + " un · " + fmt.num(x.peso) + " kg</span></li>";
            }).join("");

            foco = -1;
        },

        // destaca no percurso a etapa que está em foco na linha do tempo
        marcarFoco: function (i) {
            if (i === foco) {
                return;
            }

            foco = i;

            passos.forEach(function (li, k) {
                li.classList.toggle("act", k === i);
            });
        }
    };

})(window.Korven);
