(function () {

//formulario de orçamento

    document.getElementById("qf").addEventListener("submit", function (e) {
        e.preventDefault();

        document.getElementById("ok").textContent =
            "Pedido enviado. Retornamos em até 1 dia útil.";

        e.target.reset();
    });


//animação de números

    var els = document.querySelectorAll("[data-n]");

    var io = new IntersectionObserver(function (en) {
        en.forEach(function (x) {
            if (!x.isIntersecting) {
                return;
            }

            io.unobserve(x.target);

            var el = x.target;
            var n = parseFloat(el.dataset.n);
            var s = el.dataset.s || "";
            var d = n % 1 ? 1 : 0;
            var t0 = null;

            (function f(t) {
                t0 = t0 || t;

                var k = Math.min((t - t0) / 1400, 1);

                el.textContent =
                    (n * (1 - Math.pow(1 - k, 3)))
                        .toLocaleString("pt-BR", {
                            minimumFractionDigits: d,
                            maximumFractionDigits: d
                        }) + s;

                if (k < 1) {
                    requestAnimationFrame(f);
                }
            })(performance.now());
        });
    }, {
        threshold: 0.4
    });

    els.forEach(function (e) {
        io.observe(e);
    });

})(); 