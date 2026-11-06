//fundo da casca: curvas de nível geradas por funções senoidais, com parallax em 3 camadas
//
// Markup esperado: <div class="bg" id="bg"><div class="bg-l" data-k="0.03"></div> ... </div>

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var mk = K.dom.mk;

    function rng(seed) {
        return function () {
            seed |= 0;
            seed = seed + 0x6D2B79F5 | 0;

            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);

            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;

            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // curva fechada suave (Catmull-Rom → Bézier)
    function blob(cx, cy, r, ph) {
        var pts = [];
        var n = 56;
        var i;

        for (i = 0; i < n; i++) {
            var a = (i / n) * Math.PI * 2;
            var k = 1 + 0.15 * Math.sin(3 * a + ph[0]) + 0.08 * Math.sin(5 * a + ph[1]) + 0.045 * Math.sin(8 * a + ph[2]);

            pts.push([cx + Math.cos(a) * r * k * 1.25, cy + Math.sin(a) * r * k]);
        }

        var d = "M" + pts[0][0].toFixed(1) + " " + pts[0][1].toFixed(1);

        for (i = 0; i < n; i++) {
            var p0 = pts[(i - 1 + n) % n];
            var p1 = pts[i];
            var p2 = pts[(i + 1) % n];
            var p3 = pts[(i + 2) % n];

            d += "C" + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(1) + " " + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(1) + " " +
                (p2[0] - (p3[0] - p1[0]) / 6).toFixed(1) + " " + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(1) + " " +
                p2[0].toFixed(1) + " " + p2[1].toFixed(1);
        }

        return d + "Z";
    }

    K.fundo = {
        iniciar: function (bg) {
            if (!bg) {
                return;
            }

            var layers = Array.prototype.slice.call(bg.querySelectorAll(".bg-l"));
            var centers = [[[360, 260], [1260, 700]], [[900, 160], [260, 760]], [[1380, 280], [620, 820]]];
            var opac = [0.04, 0.065, 0.1];

            layers.forEach(function (box, li) {
                var rnd = rng(11 + li * 37);
                var svg = mk("svg", { viewBox: "0 0 1600 1000", preserveAspectRatio: "xMidYMid slice", "aria-hidden": "true" });

                centers[li].forEach(function (c) {
                    var ph = [rnd() * 6, rnd() * 6, rnd() * 6];

                    for (var k = 1; k <= 15; k++) {
                        var p = mk("path", { d: blob(c[0], c[1], 30 + k * (24 + li * 5), ph) }, svg);

                        p.setAttribute("stroke-width", k % 5 === 0 ? 1.4 : 0.8);
                        p.setAttribute("stroke-opacity", (k % 5 === 0 ? opac[li] * 1.7 : opac[li]).toFixed(3));
                    }
                });

                box.appendChild(svg);
            });

            if (K.dom.reduce) {
                return;
            }

            // parallax pela rolagem e pelo mouse, atualizado no máximo uma vez por quadro
            var mouse = { x: 0, y: 0 };
            var queued = false;

            function draw() {
                queued = false;

                layers.forEach(function (l) {
                    var k = parseFloat(l.getAttribute("data-k"));
                    var x = (-mouse.x * 460 * k).toFixed(1);
                    var y = (-window.scrollY * k - mouse.y * 300 * k).toFixed(1);

                    l.style.transform = "translate3d(" + x + "px," + y + "px,0)";
                });
            }

            function queue() {
                if (!queued) {
                    queued = true;
                    requestAnimationFrame(draw);
                }
            }

            window.addEventListener("scroll", queue, { passive: true });
            window.addEventListener("pointermove", function (e) {
                mouse.x = e.clientX / window.innerWidth - 0.5;
                mouse.y = e.clientY / window.innerHeight - 0.5;
                queue();
            }, { passive: true });
        }
    };

})(window.Korven);
