//relatórios (admin): entregas, prazo, tempo médio e frete por período, cliente, motorista e status; exporta CSV

(function (K) {
    "use strict";

    var esc = K.dom.esc;

    function inicioDaSemana(iso) {
        var d = new Date(iso + "T12:00:00");

        d.setDate(d.getDate() - ((d.getDay() + 6) % 7));

        return K.fmt.isoDia(d);
    }

    // série para o gráfico: dia a dia (até 45 dias) ou semana a semana
    function serie(porDia, ini, fim) {
        var mapa = {};
        var dias = Math.round((new Date(fim + "T12:00:00") - new Date(ini + "T12:00:00")) / 864e5) + 1;
        var semanal = dias > 45;
        var chaves = [];
        var d = new Date(ini + "T12:00:00");

        porDia.forEach(function (x) {
            var k = semanal ? inicioDaSemana(x.dia) : x.dia;

            mapa[k] = (mapa[k] || 0) + x.entregas;
        });

        for (var i = 0; i < dias; i++) {
            var k = semanal ? inicioDaSemana(K.fmt.isoDia(d)) : K.fmt.isoDia(d);

            if (chaves.indexOf(k) < 0) {
                chaves.push(k);
            }

            d.setDate(d.getDate() + 1);
        }

        return { semanal: semanal, itens: chaves.map(function (k) { return { rotulo: K.graf.rotuloDia(k, false), n: mapa[k] || 0, dica: (semanal ? "Semana de " : "") + K.graf.rotuloDia(k) + ": " + (mapa[k] || 0) }; }) };
    }

    function csv(linhas) {
        var cab = ["Código", "Pedido", "Cliente", "Motorista", "Destinatário", "Origem", "Destino", "Status", "Solicitação", "Previsão", "Conclusão", "Frete (R$)"];
        var f = function (v) { return v ? K.fmt.data(v) + " " + K.fmt.pad(new Date(v).getHours()) + ":" + K.fmt.pad(new Date(v).getMinutes()) : ""; };
        var q = function (v) { return '"' + String(v == null ? "" : v).replace(/"/g, '""') + '"'; };
        var rows = linhas.map(function (l) {
            return [l.codigo, l.pedido, l.cliente, l.motorista, l.destinatario, l.origem, l.destino, K.status.rotulo[l.status], f(l.solicitacao), f(l.prevista), f(l.conclusao), String(Number(l.frete).toFixed(2)).replace(".", ",")].map(q).join(";");
        });

        return "﻿" + [cab.map(q).join(";")].concat(rows).join("\r\n");
    }

    function baixar(nome, texto) {
        var url = URL.createObjectURL(new Blob([texto], { type: "text/csv;charset=utf-8" }));
        var a = document.createElement("a");

        a.href = url;
        a.download = nome;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    K.paginas.relatorios = {
        titulo: "Relatórios",

        render: function (el) {
            var hoje = new Date();
            var fim = K.fmt.isoDia(hoje);
            var ini = new Date(hoje);

            ini.setDate(ini.getDate() - 29);
            ini = K.fmt.isoDia(ini);

            var ultimo = null;
            var n = 0;

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">Gestão</p><h1><em>Relatórios</em></h1></div><div class="head-acts"><button class="btn ghost" id="csv" type="button" disabled>' + K.ui.icone("M12 4v11M7 11l5 5 5-5M5 20h14") + " Exportar CSV</button></div></div>" +
                '<section class="card rise" style="--i:1"><div class="bar"><button class="fchip" data-d="7" type="button">7 dias</button><button class="fchip" data-d="30" type="button" aria-pressed="true">30 dias</button><button class="fchip" data-d="90" type="button">90 dias</button><button class="fchip" data-d="mes" type="button">Este mês</button>' +
                '<span style="margin-left:auto" class="bar"><input class="inp" id="r-ini" type="date" aria-label="De" value="' + ini + '"><input class="inp" id="r-fim" type="date" aria-label="Até" value="' + fim + '"></span></div></section>' +
                '<div id="rel">' + K.ui.carregando(4) + "</div>";

            var rel = el.querySelector("#rel");
            var $ = function (id) { return el.querySelector("#" + id); };

            function carregar() {
                var i = $("r-ini").value;
                var f = $("r-fim").value;
                var seq = ++n;

                if (!i || !f || f < i) {
                    K.aviso("Período inválido", "A data final precisa ser igual ou depois da inicial.", "erro");
                    return;
                }

                rel.style.opacity = "0.55";

                return K.api.painel.relatorio(i, f).then(function (r) {
                    if (seq !== n) {
                        return;
                    }

                    rel.style.opacity = "";
                    ultimo = r;
                    $("csv").disabled = !r.linhas.length;

                    if (!r.total) {
                        rel.innerHTML = '<section class="card">' + K.ui.vazio("Sem entregas no período", "Escolha outro intervalo de datas.", "", "busca") + "</section>";
                        return;
                    }

                    var s = serie(r.por_dia, i, f);
                    var porStatus = K.status.ordem.map(function (st) { return { rotulo: K.status.rotulo[st], n: r.por_status[st] || 0 }; }).filter(function (x) { return x.n; });

                    rel.innerHTML = '<div class="kpis">' +
                        [["Entregas", r.total, "no período"], ["Concluídas", r.entregues, "já entregues"], ["No prazo", r.pct_no_prazo == null ? "—" : r.pct_no_prazo + "%", "das concluídas"],
                            ["Tempo médio", r.tempo_medio_horas == null ? "—" : K.fmt.num(Number(r.tempo_medio_horas)) + " h", "da solicitação à entrega"], ["Frete", K.fmt.moeda(r.frete_total), "no período"]].map(function (k, x) {
                            return '<div class="kpi rise" style="--i:' + x + '"><span class="kpi-l">' + k[0] + '</span><b class="kpi-v' + (k[0] === "Frete" ? " moeda" : "") + '">' + k[1] + '</b><span class="kpi-d">' + k[2] + "</span></div>";
                        }).join("") + "</div>" +
                        '<div class="duo"><section class="card rise" style="--i:5"><div class="card-h"><h2>Solicitações ' + (s.semanal ? "por semana" : "por dia") + "</h2></div>" + K.graf.barras(s.itens, { titulo: "Solicitações no período" }) + "</section>" +
                        '<section class="card rise" style="--i:6"><div class="card-h"><h2>Por status</h2></div>' + K.graf.hbarras(porStatus) + "</section></div>" +
                        '<div class="duo"><section class="card tbl-wrap rise" style="--i:7"><div class="card-h" style="padding:22px 24px 0"><h2>Por cliente</h2></div><table class="tbl"><thead><tr><th>Cliente</th><th class="num">Entregas</th><th class="num">Frete</th></tr></thead><tbody>' +
                        r.por_cliente.map(function (c) { return '<tr><td data-l="Cliente" class="full strong">' + esc(c.nome) + '</td><td data-l="Entregas" class="num">' + c.entregas + '</td><td data-l="Frete" class="num">' + K.fmt.moeda(c.frete) + "</td></tr>"; }).join("") + "</tbody></table></section>" +
                        '<section class="card tbl-wrap rise" style="--i:8"><div class="card-h" style="padding:22px 24px 0"><h2>Por motorista</h2></div><table class="tbl"><thead><tr><th>Motorista</th><th class="num">Entregas</th><th class="num">No prazo</th></tr></thead><tbody>' +
                        r.por_motorista.map(function (m) {
                            var pct = m.entregues ? Math.round((100 * m.no_prazo) / m.entregues) + "%" : "—";

                            return '<tr><td data-l="Motorista" class="full strong">' + esc(m.nome) + '</td><td data-l="Entregas" class="num">' + m.entregas + '</td><td data-l="No prazo" class="num">' + pct + "</td></tr>";
                        }).join("") + "</tbody></table></section></div>";
                }).catch(function (e) {
                    rel.style.opacity = "";
                    rel.innerHTML = '<section class="card">' + K.ui.falha(e, true) + "</section>";
                });
            }

            el.querySelector(".bar").addEventListener("click", function (e) {
                var b = e.target.closest("[data-d]");

                if (!b) {
                    return;
                }

                var d = new Date();
                var v = b.getAttribute("data-d");

                if (v === "mes") {
                    d.setDate(1);
                } else {
                    d.setDate(d.getDate() - (Number(v) - 1));
                }

                $("r-ini").value = K.fmt.isoDia(d);
                $("r-fim").value = K.fmt.isoDia(new Date());

                Array.prototype.forEach.call(el.querySelectorAll("[data-d]"), function (x) { x.setAttribute("aria-pressed", String(x === b)); });
                carregar();
            });

            ["r-ini", "r-fim"].forEach(function (id) {
                $(id).addEventListener("change", function () {
                    Array.prototype.forEach.call(el.querySelectorAll("[data-d]"), function (x) { x.setAttribute("aria-pressed", "false"); });
                    carregar();
                });
            });

            $("csv").addEventListener("click", function () {
                if (ultimo && ultimo.linhas.length) {
                    baixar("korven-entregas-" + $("r-ini").value + "_a_" + $("r-fim").value + ".csv", csv(ultimo.linhas));
                    K.aviso("CSV gerado", ultimo.linhas.length + " entregas exportadas.");
                }
            });

            rel.addEventListener("click", function (e) {
                if (e.target.closest("[data-tentar]")) {
                    carregar();
                }
            });

            return carregar();
        }
    };

})(window.Korven);
