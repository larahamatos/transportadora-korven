//painel: números do dia, etapas das entregas, últimos 7 dias e o que precisa de atenção

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;

    function kpi(i, o) {
        var tag = o.href ? "a" : "div";

        return "<" + tag + ' class="kpi rise ' + (o.tom || "") + '" style="--i:' + i + '"' + (o.href ? ' href="' + o.href + '"' : "") + ">" +
            '<span class="kpi-l">' + o.rotulo + "</span>" +
            '<b class="kpi-v' + (o.moeda ? ' moeda' : '') + '" data-n="' + (o.valor == null ? "" : o.valor) + '"' + (o.moeda ? ' data-moeda="1"' : "") + ">" + (o.valor == null ? "—" : "0") + "</b>" +
            '<span class="kpi-d">' + o.dica + "</span></" + tag + ">";
    }

    function atencao(lista) {
        if (!lista.length) {
            return K.ui.vazio("Tudo em dia", "Nenhuma entrega atrasada" + (S.staff ? " ou sem motorista" : "") + " agora.");
        }

        return '<ul class="aten">' + lista.map(function (a) {
            var tags = "";

            if (a.atrasada) {
                tags += '<span class="tag late">Atrasada ' + K.fmt.relativo(a.data_prevista).replace(/^há /, "há ") + "</span>";
            }

            if (a.sem_motorista) {
                tags += '<span class="tag nodrv">Sem motorista</span>';
            }

            return '<li><a href="#/entregas/' + esc(a.codigo_rastreamento) + '"><div><b class="code">' + esc(a.codigo_rastreamento) + "</b><span>" + esc(a.nome_destinatario) + " · " + esc(a.endereco_destino) + '</span></div><div class="aten-t">' + tags + "</div></a></li>";
        }).join("") + "</ul>";
    }

    function motoristas(m) {
        var itens = [["disponivel", "Disponíveis"], ["em_entrega", "Em entrega"], ["indisponivel", "Indisponíveis"]];

        return '<div class="drv">' + itens.map(function (i) {
            return '<a href="#/motoristas" class="drv-' + i[0] + '"><b>' + (m[i[0]] || 0) + "</b><span>" + i[1] + "</span></a>";
        }).join("") + "</div>";
    }

    K.paginas.painel = {
        titulo: "Painel",

        render: function (el) {
            var nome = S.usuario.nome.split(" ")[0];

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">' + (S.pode("cliente") ? esc(S.cliente ? S.cliente.nome : "Cliente") : K.status.perfil[S.perfil]) + '</p><h1>Olá, <em>' + esc(nome) + "</em></h1></div>" +
                '<div class="head-acts"><a class="btn" href="#/entregas/nova">' + K.ui.icone("M12 5v14M5 12h14") + " Nova entrega</a></div></div>" +
                '<div id="dash">' + K.ui.carregando(4) + "</div>";

            return K.api.painel.resumo().then(function (d) {
                var porStatus = d.por_status || {};
                var kpis = [];
                var i = 0;

                kpis.push(kpi(i++, { rotulo: "Em andamento", valor: d.em_andamento, dica: d.total + " no total", href: "#/entregas?f=andamento" }));
                kpis.push(kpi(i++, { rotulo: "Atrasadas", valor: d.atrasadas, dica: d.atrasadas ? "passaram da previsão" : "nenhuma atrasada", tom: d.atrasadas ? "warn" : "", href: "#/entregas?f=atrasadas" }));

                if (S.staff) {
                    kpis.push(kpi(i++, { rotulo: "Sem motorista", valor: d.sem_motorista, dica: "aguardando atribuição", tom: d.sem_motorista ? "warn" : "", href: "#/entregas?f=semmotorista" }));
                }

                kpis.push(kpi(i++, { rotulo: "Concluídas hoje", valor: d.concluidas_hoje, dica: "entregas finalizadas", href: "#/entregas?status=entregue" }));

                kpis.push('<div class="kpi kpi-anel rise" style="--i:' + i++ + '"><div><span class="kpi-l">Entregas no prazo</span><span class="kpi-d">das já concluídas</span></div>' + K.graf.anel(d.pct_no_prazo == null ? null : Number(d.pct_no_prazo), 92) + "</div>");

                if (S.pode("admin")) {
                    kpis.push(kpi(i++, { rotulo: "Frete total", valor: Number(d.frete_total), moeda: true, dica: "soma de todas as entregas" }));
                }

                var dias = (d.por_dia || []).map(function (x) {
                    return { rotulo: K.graf.rotuloDia(x.dia, true), n: x.n, dica: K.graf.rotuloDia(x.dia) + ": " + x.n + (x.n === 1 ? " solicitação" : " solicitações") };
                });

                el.querySelector("#dash").outerHTML = '<div class="kpis">' + kpis.join("") + "</div>" +
                    '<section class="card rise" style="--i:6"><div class="card-h"><h2>Entregas por etapa</h2><a class="link" href="#/entregas">Ver todas</a></div>' +
                    K.graf.pipeline(porStatus, function (s) { return "#/entregas?status=" + s; }) + "</section>" +
                    '<div class="duo">' +
                    '<section class="card rise" style="--i:7"><div class="card-h"><h2>Solicitações · últimos 7 dias</h2></div>' + K.graf.barras(dias, { titulo: "Solicitações por dia" }) + "</section>" +
                    '<section class="card rise" style="--i:8"><div class="card-h"><h2>Precisam de atenção</h2></div>' + atencao(d.atencao || []) + "</section>" +
                    "</div>" +
                    (S.staff ? '<section class="card rise" style="--i:9"><div class="card-h"><h2>Motoristas</h2><a class="link" href="#/motoristas">Ver equipe</a></div>' + motoristas(d.motoristas || {}) + "</section>" : "");

                Array.prototype.forEach.call(el.querySelectorAll(".kpi-v[data-n]"), function (b) {
                    var n = b.getAttribute("data-n");

                    if (n !== "") {
                        K.graf.contar(b, Number(n), b.hasAttribute("data-moeda") ? K.fmt.moeda : null);
                    }
                });
            });
        }
    };

})(window.Korven);
