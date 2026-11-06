//histórico de entrega: o fio da rota
//
// Uma linha em curvas de S desce pela página ligando as etapas do histórico.
// O trecho já percorrido é desenhado conforme a página rola; uma "lente" desliza pelo fio
// acompanhando a etapa em foco. Os cartões ficam ao lado de cada nó.

window.Korven = window.Korven || {};
window.Korven.historico = window.Korven.historico || {};

(function (K) {
    "use strict";

    var dom = K.dom;
    var mk = dom.mk;
    var put = dom.put;
    var esc = dom.esc;
    var clamp = dom.clamp;
    var r1 = dom.r1;
    var fmt = K.fmt;
    var reduce = dom.reduce;
    var N = K.historico.ETAPAS.length;

    var els = null;
    var M = null;           // modelo da entrega (modelo.js)
    var T = null;           // layout e animação do fio
    var E = null;           // elementos SVG
    var cards = [];
    var lis = [];
    var io = null;
    var view = 0;           // posição contínua da lente (0..N-1)
    var lastT = 0;
    var focoIdx = -1;
    var playing = false;
    var playTimer = 0;
    var layoutPending = false;

    var api = {
        aoFocar: null,
        aoReproduzir: null
    };


    //cartões

    function pintarCard(i) {
        var et = M.etapas[i];
        var card = cards[i];
        var st = et.estado === "feito" ? "done" : et.estado === "atual" ? "now" : "next";
        var palavras = et.titulo.split(" ").map(function (w, k) {
            return '<span class="wm"><span class="w" style="--k:' + k + '">' + esc(w) + "</span></span>";
        }).join(" ");
        var html = '<div class="ev-k"><span class="ev-st">' + (st === "done" ? "Registrado" : st === "now" ? "Status atual" : "Pendente") + "</span>";

        if (et.data) {
            html += '<time datetime="' + et.data.toISOString() + '">' + fmt.dataHora(et.data) + "</time>";
        }

        html += '</div><h3 class="ev-t">' + palavras + "</h3>";

        if (et.observacao) {
            html += '<p class="ev-o">' + esc(et.observacao) + "</p>";
        }

        // a única previsão que o banco guarda é a da entrega final
        if (st === "next" && i === N - 1) {
            html += '<p class="ev-o">Previsão de entrega: ' + fmt.dataHora(M.prevista) + "</p>";
        }

        if (et.usuario) {
            html += '<div class="ev-f"><span class="ev-who"><i>' + esc(fmt.iniciais(et.usuario.nome)) + "</i><span>" +
                esc(et.usuario.nome) + " <small>· " + esc(et.usuario.perfil) + "</small></span></span></div>";
        }

        card.setAttribute("data-st", st);
        lis[i].setAttribute("data-st", st);
        card.innerHTML = html;
    }

    function montarCards() {
        els.list.textContent = "";
        cards = [];
        lis = [];

        if (io) {
            io.disconnect();
        }

        for (var i = 0; i < N; i++) {
            var li = document.createElement("li");
            var card = document.createElement("article");

            li.className = "ev";
            card.className = "ev-card";
            card.tabIndex = 0;
            card.setAttribute("aria-label", "Etapa " + (i + 1) + " de " + N + ": " + M.etapas[i].titulo);

            li.appendChild(card);
            els.list.appendChild(li);
            lis.push(li);
            cards.push(card);

            inclinar(card);
            pintarCard(i);

            if (reduce) {
                li.classList.add("in");
            } else {
                io.observe(li);
            }
        }
    }

    // leve inclinação do cartão acompanhando o mouse
    function inclinar(card) {
        if (!dom.fine || reduce) {
            return;
        }

        card.addEventListener("pointermove", function (e) {
            var r = card.getBoundingClientRect();
            var px = (e.clientX - r.left) / r.width - 0.5;
            var py = (e.clientY - r.top) / r.height - 0.5;

            card.classList.add("hov");
            card.style.setProperty("--ry", (px * 5).toFixed(2) + "deg");
            card.style.setProperty("--rx", (-py * 3.5).toFixed(2) + "deg");
        });

        card.addEventListener("pointerleave", function () {
            card.classList.remove("hov");
            card.style.setProperty("--ry", "0deg");
            card.style.setProperty("--rx", "0deg");
        });
    }


    //fio (SVG)

    function montarSvg() {
        els.svg.textContent = "";

        E = { nodes: [], teth: [] };

        var g = mk("g", {}, els.svg);

        E.mp = mk("path", { fill: "none", stroke: "none" }, g);
        E.track = mk("path", { "class": "f-track" }, g);
        E.halo = mk("path", { "class": "f-halo" }, g);
        E.real = mk("path", { "class": "f-real" }, g);
        E.real2 = mk("path", { "class": "f-real2" }, g);
        E.c1 = mk("path", { "class": "f-comet", "stroke-width": 9, "stroke-opacity": 0.14 }, g);
        E.c2 = mk("path", { "class": "f-comet", "stroke-width": 6.5, "stroke-opacity": 0.3 }, g);
        E.c3 = mk("path", { "class": "f-comet", "stroke-width": 4, "stroke-opacity": 0.8 }, g);
        E.pulse = mk("path", { "class": "f-pulse", "stroke-opacity": 0 }, g);

        var gt = mk("g", {}, g);
        var gn = mk("g", {}, g);

        for (var i = 0; i < N; i++) {
            var t = mk("g", { "class": "f-t" }, gt);

            mk("path", { "class": "f-tb" }, t);
            mk("path", { "class": "f-ta", pathLength: 1 }, t);
            E.teth.push(t);

            var n = mk("g", {
                "class": "node",
                tabindex: 0,
                role: "button",
                "aria-label": "Ir para a etapa " + (i + 1) + ": " + M.etapas[i].titulo
            }, gn);

            mk("circle", { "class": "n-son", r: 22 }, n);
            mk("circle", { "class": "n-son", r: 22 }, n);
            mk("circle", { "class": "n-ring", r: 32 }, n);
            mk("circle", { "class": "n-glow", r: 28 }, n);
            mk("circle", { "class": "n-disc", r: 22 }, n);
            mk("path", { d: M.etapas[i].icone }, mk("g", { "class": "n-ico" }, mk("g", { transform: "translate(-11 -11)" }, n)));
            mk("circle", { r: 36, fill: "transparent" }, n);

            ligarNo(n, i);
            E.nodes.push(n);
        }

        E.lens = mk("g", { "class": "lens" }, els.svg);
        mk("circle", { "class": "lens-r", r: 15 }, E.lens);
        mk("circle", { "class": "lens-d", r: 4 }, E.lens);
    }

    function ligarNo(n, i) {
        n.addEventListener("click", function () {
            api.irPara(i);
        });

        n.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                api.irPara(i);
            }
        });
    }

    // posiciona nós e trajeto conforme o tamanho real dos cartões
    function layout() {
        if (!M || !E || !cards[0]) {
            return;
        }

        var W = els.fio.clientWidth;
        var H = els.fio.clientHeight;

        if (!W) {
            return;
        }

        var mob = W < 640;

        els.fio.classList.toggle("mob", mob);

        var base = els.list.offsetTop;
        var nodes = [];
        var i;

        for (i = 0; i < N; i++) {
            var c = cards[i];

            nodes.push({
                x: mob ? 28 + (i % 2 ? 4 : -4) : W * (i % 2 ? 0.645 : 0.355),
                y: base + c.offsetTop + c.offsetHeight / 2,
                cl: c.offsetLeft,
                cr: c.offsetLeft + c.offsetWidth
            });
        }

        els.svg.setAttribute("viewBox", "0 0 " + W + " " + H);
        els.svg.setAttribute("width", W);
        els.svg.setAttribute("height", H);

        // sai do topo, passa por cada nó em curvas de S e segue um pouco além do último
        var d = "M" + nodes[0].x.toFixed(1) + " 10L" + nodes[0].x.toFixed(1) + " " + nodes[0].y.toFixed(1);

        E.mp.setAttribute("d", d);
        nodes[0].len = E.mp.getTotalLength();

        for (i = 1; i < N; i++) {
            var a = nodes[i - 1];
            var b = nodes[i];
            var k = (b.y - a.y) * 0.55;

            d += "C" + a.x.toFixed(1) + " " + (a.y + k).toFixed(1) + " " + b.x.toFixed(1) + " " + (b.y - k).toFixed(1) + " " + b.x.toFixed(1) + " " + b.y.toFixed(1);

            E.mp.setAttribute("d", d);
            b.len = E.mp.getTotalLength();
        }

        var last = nodes[N - 1];

        d += "L" + last.x.toFixed(1) + " " + (last.y + 120).toFixed(1);

        [E.mp, E.track, E.halo, E.real, E.real2, E.c1, E.c2, E.c3, E.pulse].forEach(function (p) {
            p.setAttribute("d", d);
            p.__c = null;
        });

        T.nodes = nodes;
        T.total = E.mp.getTotalLength();
        T.W = W;
        T.actual = nodes[M.atual].len;
        T.ready = true;

        [E.real, E.real2, E.halo].forEach(function (p) {
            p.setAttribute("stroke-dasharray", T.total + " " + T.total);
        });

        for (i = 0; i < N; i++) {
            var nd = nodes[i];
            var esquerda = !mob && i % 2 === 1;
            var sx = esquerda ? nd.x - 30 : nd.x + (mob ? 24 : 30);
            var ex = esquerda ? nd.cr : nd.cl;
            var dd = "M" + sx.toFixed(1) + " " + nd.y.toFixed(1) + "H" + ex.toFixed(1);

            E.nodes[i].setAttribute("transform", "translate(" + nd.x.toFixed(1) + " " + nd.y.toFixed(1) + ")");
            E.teth[i].children[0].setAttribute("d", dd);
            E.teth[i].children[1].setAttribute("d", dd);
        }
    }

    function agendarLayout() {
        if (layoutPending) {
            return;
        }

        layoutPending = true;

        requestAnimationFrame(function () {
            layoutPending = false;
            layout();
        });
    }

    function viewDeY(y) {
        var ns = T.nodes;

        if (y <= ns[0].y) {
            return 0;
        }

        for (var i = 0; i < N - 1; i++) {
            if (y <= ns[i + 1].y) {
                return i + (y - ns[i].y) / (ns[i + 1].y - ns[i].y);
            }
        }

        return N - 1;
    }

    function comprimentoDe(v) {
        var ns = T.nodes;
        var i = clamp(Math.floor(v), 0, N - 2);
        var f = clamp(v - i, 0, 1);

        return ns[i].len + (ns[i + 1].len - ns[i].len) * f;
    }

    // acende o nó quando o fio chega nele
    function acender(i) {
        var g = E.nodes[i];

        T.lit[i] = true;
        g.classList.add("lit");
        E.teth[i].classList.add("on");

        if (i === M.atual) {
            g.classList.add("now");
        }

        if (reduce) {
            return;
        }

        [0, 1].forEach(function (k) {
            var r = mk("circle", { "class": "n-rip", r: 22 }, g);

            r.style.animationDelay = k * 0.18 + "s";

            setTimeout(function () {
                r.remove();
            }, 1700);
        });
    }

    function marcarAtual() {
        for (var i = 0; i < N; i++) {
            E.nodes[i].classList.toggle("now", i === M.atual && !!T.lit[i]);
        }
    }


    //quadro de animação

    function frame(t) {
        requestAnimationFrame(frame);

        var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);

        lastT = t;

        if (!T || !T.ready || !M) {
            return;
        }

        var rect = els.fio.getBoundingClientRect();
        var refY = window.innerHeight * 0.46 - rect.top;
        var alvo = viewDeY(refY);

        view = reduce ? alvo : view + (alvo - view) * (1 - Math.pow(0.0006, dt));

        if (Math.abs(alvo - view) < 0.0008) {
            view = alvo;
        }

        var lente = comprimentoDe(view);
        var adiante = view > M.atual + 0.002;
        var total = T.total;

        // o fio vai sendo desenhado à frente da lente, até onde a carga realmente chegou
        T.want = Math.min(T.actual, Math.max(T.want, comprimentoDe(alvo) + 340));

        if (reduce) {
            T.draw = T.want;
        } else {
            var gap = T.want - T.draw;

            T.draw = gap > 0.4 ? T.draw + Math.min(gap * (1 - Math.pow(0.06, dt)) + 0.5, 1700 * dt) : T.want;
        }

        var desenhado = Math.min(T.draw, total);
        var visto = Math.min(lente, desenhado);

        put(E.real, "stroke-dashoffset", r1(total - desenhado));
        put(E.real2, "stroke-dashoffset", r1(total - visto));
        put(E.halo, "stroke-dashoffset", r1(total - visto));

        for (var i = 0; i < N; i++) {
            if (!T.lit[i] && desenhado >= T.nodes[i].len - 3) {
                acender(i);
            }
        }

        // lente com rastro de cometa
        var p = E.mp.getPointAtLength(lente);

        put(E.lens, "transform", "translate(" + r1(p.x) + " " + r1(p.y) + ")");
        E.lens.classList.toggle("ghost", adiante);
        els.svg.classList.toggle("ahead", adiante);

        [[E.c1, 150], [E.c2, 92], [E.c3, 44]].forEach(function (s) {
            put(s[0], "stroke-dasharray", s[1] + " " + r1(total * 2));
            put(s[0], "stroke-dashoffset", r1(-(lente - s[1])));
        });

        // pulso de dados correndo do início até a carga
        if (!reduce) {
            T.pt = (T.pt || 0) + dt / 3.4;

            if (T.pt > 1.25) {
                T.pt = 0;
            }

            var pe = Math.min(1, T.pt);

            put(E.pulse, "stroke-dasharray", "56 " + r1(total * 2));
            put(E.pulse, "stroke-dashoffset", r1(-(dom.ease(pe) * visto - 56)));
            put(E.pulse, "stroke-opacity", r1(Math.sin(Math.PI * pe) * 0.75 * (visto > 60 ? 1 : 0)));
        }

        // etapa em foco
        var idx = Math.round(view);

        if (idx !== focoIdx) {
            focoIdx = idx;

            for (i = 0; i < N; i++) {
                cards[i].classList.toggle("act", i === idx);
                E.nodes[i].classList.toggle("act", i === idx);
            }

            if (api.aoFocar) {
                api.aoFocar(idx);
            }
        }
    }


    //reprodução e navegação

    function definirReproducao(v) {
        playing = v;

        if (api.aoReproduzir) {
            api.aoReproduzir(v);
        }
    }

    api.iniciar = function (refs) {
        els = refs;

        io = new IntersectionObserver(function (en) {
            en.forEach(function (x) {
                if (x.isIntersecting) {
                    x.target.classList.add("in");
                    io.unobserve(x.target);
                }
            });
        }, { threshold: 0.12 });

        if (window.ResizeObserver) {
            new ResizeObserver(agendarLayout).observe(els.fio);
        } else {
            window.addEventListener("resize", agendarLayout);
        }

        if (document.fonts && document.fonts.ready) {
            document.fonts.ready.then(agendarLayout);
        }

        // qualquer gesto do usuário interrompe a reprodução
        ["wheel", "touchstart"].forEach(function (ev) {
            window.addEventListener(ev, api.parar, { passive: true });
        });

        document.addEventListener("keydown", function (e) {
            if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"].indexOf(e.key) >= 0) {
                api.parar();
            }
        });

        requestAnimationFrame(frame);
    };

    // monta a linha do tempo de uma entrega
    api.montar = function (modelo) {
        M = modelo;
        T = { nodes: [], total: 1, lit: [], want: 0, draw: 0, actual: 0, pt: 0, ready: false, W: 0 };
        view = 0;
        focoIdx = -1;

        montarCards();
        montarSvg();

        requestAnimationFrame(layout);
    };

    // mesma entrega com dados novos (ex.: um novo status foi registrado)
    api.atualizar = function (modelo) {
        M = modelo;

        for (var i = 0; i < N; i++) {
            pintarCard(i);
        }

        layout();
        marcarAtual();

        var c = cards[M.atual];

        c.classList.remove("flash");
        void c.offsetWidth;
        c.classList.add("flash");

        api.irPara(M.atual);
    };

    api.irPara = function (i) {
        if (!T || !T.ready) {
            return;
        }

        var topo = els.fio.getBoundingClientRect().top + window.scrollY + T.nodes[i].y - window.innerHeight * 0.46;

        window.scrollTo({ top: Math.max(0, topo), behavior: reduce ? "auto" : "smooth" });
    };

    api.irParaAtual = function () {
        api.parar();
        api.irPara(M.atual);
    };

    api.parar = function () {
        if (!playing) {
            return;
        }

        clearTimeout(playTimer);
        definirReproducao(false);
    };

    // percorre o histórico, etapa por etapa, até o status atual
    api.reproduzir = function () {
        if (playing) {
            api.parar();
            return;
        }

        definirReproducao(true);

        var i = 0;

        (function passo() {
            if (!playing) {
                return;
            }

            api.irPara(i);

            if (i >= M.atual) {
                playTimer = setTimeout(api.parar, 1600);
                return;
            }

            i++;
            playTimer = setTimeout(passo, reduce ? 1200 : 1900);
        })();
    };

    K.historico.linha = api;

})(window.Korven);
