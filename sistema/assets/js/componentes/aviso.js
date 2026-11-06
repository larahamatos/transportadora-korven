//aviso rápido no canto da tela (toast). Precisa de <div id="toasts"> na página.

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var ICONES = {
        ok: "M20 6.5 9.5 17.5 4 12",
        erro: "M12 7v6M12 17h.01"
    };

    // tipo: "ok" (padrão) ou "erro"
    K.aviso = function (titulo, texto, tipo) {
        var box = document.getElementById("toasts");

        if (!box) {
            return;
        }

        var t = document.createElement("div");

        tipo = tipo || "ok";

        t.className = "toast";
        t.setAttribute("data-t", tipo);

        var i = document.createElement("i");

        i.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + ICONES[tipo] + '"/></svg>';

        var c = document.createElement("div");
        var b = document.createElement("b");
        var s = document.createElement("span");

        b.textContent = titulo;
        s.textContent = texto || "";
        c.appendChild(b);
        c.appendChild(s);

        t.appendChild(i);
        t.appendChild(c);
        box.appendChild(t);

        setTimeout(function () {
            t.classList.add("out");

            setTimeout(function () {
                t.remove();
            }, 420);
        }, 4200);
    };

})(window.Korven);
