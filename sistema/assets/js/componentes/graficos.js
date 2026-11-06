//gráficos leves em SVG/HTML (sem biblioteca): barras, anel de percentual, pipeline de status e barras horizontais

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var esc = K.dom.esc;

    var SEMANA = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

    function rotuloDia(iso, curto) {
        var d = new Date(iso + "T12:00:00");

        return curto ? SEMANA[d.getDay()] : K.fmt.pad(d.getDate()) + "/" + K.fmt.pad(d.getMonth() + 1);
    }

    K.graf = {
        rotuloDia: rotuloDia,

        // dados: [{ rotulo, n, dica }]; o último valor fica em destaque
        barras: function (dados, opts) {
            opts = opts || {};

            var W = 560;
            var H = opts.altura || 200;
            var base = H - 30;
            var topo = 26;
            var max = Math.max.apply(null, dados.map(function (d) { return d.n; }).concat([1]));
            var passo = (W - 20) / dados.length;
            var larg = Math.min(46, passo * 0.56);
            var pular = dados.length > 12 ? Math.ceil(dados.length / 8) : 1;
            var valores = dados.length <= 16;
            var s = '<svg class="graf-barras" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + esc(opts.titulo || "Gráfico de barras") + '" preserveAspectRatio="xMidYMid meet">';

            for (var g = 0; g <= 2; g++) {
                var y = topo + ((base - topo) * g) / 2;

                s += '<line x1="10" x2="' + (W - 10) + '" y1="' + y + '" y2="' + y + '" class="gl"/>';
            }

            dados.forEach(function (d, i) {
                var h = Math.max(d.n ? 4 : 2, ((base - topo) * d.n) / max);
                var x = 10 + passo * i + (passo - larg) / 2;
                var ultimo = i === dados.length - 1;

                s += '<g class="barra' + (ultimo ? " hoje" : "") + '" style="--i:' + i + '"><title>' + esc(d.dica || d.rotulo + ": " + d.n) + "</title>" +
                    '<rect x="' + x.toFixed(1) + '" y="' + (base - h).toFixed(1) + '" width="' + larg.toFixed(1) + '" height="' + h.toFixed(1) + '" rx="9"/>' +
                    (d.n && valores ? '<text x="' + (x + larg / 2).toFixed(1) + '" y="' + (base - h - 8).toFixed(1) + '" class="gv">' + (opts.valor ? opts.valor(d.n) : d.n) + "</text>" : "") +
                    (i % pular === 0 || i === dados.length - 1 ? '<text x="' + (x + larg / 2).toFixed(1) + '" y="' + (H - 8) + '" class="gx">' + esc(d.rotulo) + "</text>" : "") + "</g>";
            });

            return s + "</svg>";
        },

        // anel de percentual (0..100); pct nulo mostra "—"
        anel: function (pct, tamanho) {
            var t = tamanho || 96;
            var r = t / 2 - 9;
            var c = 2 * Math.PI * r;
            var v = pct == null ? 0 : K.dom.clamp(pct, 0, 100);

            return '<svg class="anel" width="' + t + '" height="' + t + '" viewBox="0 0 ' + t + " " + t + '" role="img" aria-label="' + (pct == null ? "Sem dados" : v + " por cento") + '">' +
                '<circle cx="' + t / 2 + '" cy="' + t / 2 + '" r="' + r + '" class="a-fundo"/>' +
                '<circle cx="' + t / 2 + '" cy="' + t / 2 + '" r="' + r + '" class="a-valor" style="--c:' + c.toFixed(1) + ";--v:" + ((c * (100 - v)) / 100).toFixed(1) + '" transform="rotate(-90 ' + t / 2 + " " + t / 2 + ')"/>' +
                '<text x="50%" y="50%" class="a-txt" dominant-baseline="central" text-anchor="middle">' + (pct == null ? "—" : v + "%") + "</text></svg>";
        },

        // faixa segmentada com a quantidade em cada status
        pipeline: function (porStatus, href) {
            var total = 0;

            K.status.ordem.forEach(function (s) {
                total += porStatus[s] || 0;
            });

            if (!total) {
                return '<p class="mudo">Nenhuma entrega ainda.</p>';
            }

            var faixa = K.status.ordem.map(function (s, i) {
                var n = porStatus[s] || 0;

                return n ? '<a class="seg" data-st="' + s + '" style="flex:' + n + ";--i:" + i + '" href="' + href(s) + '" title="' + K.status.rotulo[s] + ": " + n + '"><b>' + n + "</b></a>" : "";
            }).join("");

            var legenda = K.status.ordem.map(function (s) {
                return '<li><i data-st="' + s + '"></i><span>' + K.status.rotulo[s] + "</span><b>" + (porStatus[s] || 0) + "</b></li>";
            }).join("");

            return '<div class="pipe">' + faixa + '</div><ul class="pipe-leg">' + legenda + "</ul>";
        },

        // lista de barras horizontais: itens [{ rotulo, n, sub }]
        hbarras: function (itens, fmt) {
            var max = Math.max.apply(null, itens.map(function (i) { return i.n; }).concat([1]));

            return '<ul class="hbar">' + itens.map(function (i, k) {
                return '<li style="--i:' + k + '"><div><span>' + esc(i.rotulo) + (i.sub ? "<small>" + esc(i.sub) + "</small>" : "") + "</span><b>" + (fmt ? fmt(i.n) : i.n) + '</b></div><i style="--w:' + ((i.n / max) * 100).toFixed(1) + '%"></i></li>';
            }).join("") + "</ul>";
        },

        // número que sobe até o valor (respeita "reduzir movimento")
        contar: function (el, alvo, formatar) {
            formatar = formatar || function (n) { return String(Math.round(n)); };

            if (K.dom.reduce || !isFinite(alvo) || alvo === 0) {
                el.textContent = formatar(alvo);
                return;
            }

            var ini = performance.now();
            var dur = 900;

            function passo(t) {
                var p = Math.min(1, (t - ini) / dur);

                el.textContent = formatar(alvo * K.dom.ease(p));

                if (p < 1 && el.isConnected) {
                    requestAnimationFrame(passo);
                } else {
                    el.textContent = formatar(alvo);
                }
            }

            requestAnimationFrame(passo);
        }
    };

})(window.Korven);
