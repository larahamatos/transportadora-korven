// Shell de admin e operador: menu lateral por perfil, topo com usuário e gaveta no celular.
// Motorista e cliente têm shells próprios (motorista.js, cliente.js). Telas: Korven.views.

(function () {
    var usuario = Korven.auth.exigir(["admin", "operador"]);

    if (!usuario) {
        return;
    }

    var perfil = usuario.perfil_acesso;
    var $ = function (id) {
        return document.getElementById(id);
    };

    var app = $("app");
    var menu = $("menu");
    var CHAVE_RECOLHIDO = "korven.menu.recolhido";

    // ---------- Topo ----------

    Korven.ui.ligarUsuario(usuario);
    $("user").dataset.perfil = perfil;
    $("abrir-menu").innerHTML = Korven.icon("menu");
    $("fechar-menu").innerHTML = Korven.icon("fechar");
    document.querySelector(".collapse-ico").innerHTML = Korven.icon("recolher");

    // ---------- Menu lateral ----------

    Korven.menuDo(perfil).forEach(function (r, i) {
        var a = document.createElement("a");
        var rotulo = Korven.rotuloMenu(r, perfil);

        a.href = "#/" + r.id;
        a.dataset.rota = r.id;
        a.title = rotulo;
        a.style.setProperty("--i", i);
        a.innerHTML = Korven.icon(r.icone) + '<span class="label"></span>';
        a.querySelector(".label").textContent = rotulo;
        menu.appendChild(a);
    });

    function marcarAtivo(rota) {
        var alvo = rota && (rota.pai || rota.id);

        menu.querySelectorAll("a").forEach(function (a) {
            var ativo = a.dataset.rota === alvo;

            a.classList.toggle("ativo", ativo);

            if (ativo) {
                a.setAttribute("aria-current", "page");
            } else {
                a.removeAttribute("aria-current");
            }
        });
    }

    // Recolher (desktop) — lembra a escolha.
    function recolher(sim) {
        app.classList.toggle("recolhido", sim);
        $("recolher").setAttribute("aria-pressed", String(sim));
        $("recolher").querySelector(".label").textContent = sim ? "Expandir menu" : "Recolher menu";

        try {
            localStorage.setItem(CHAVE_RECOLHIDO, sim ? "1" : "0");
        } catch (e) {}
    }

    try {
        if (localStorage.getItem(CHAVE_RECOLHIDO) === "1") {
            recolher(true);
        }
    } catch (e) {}

    $("recolher").addEventListener("click", function () {
        recolher(!app.classList.contains("recolhido"));
    });

    // Gaveta (celular)
    function gaveta(abrir) {
        app.classList.toggle("menu-aberto", abrir);
        $("abrir-menu").setAttribute("aria-expanded", String(abrir));

        if (abrir) {
            menu.querySelector("a.ativo, a").focus();
        }
    }

    $("abrir-menu").addEventListener("click", function () {
        gaveta(true);
    });

    $("fechar-menu").addEventListener("click", function () {
        gaveta(false);
        $("abrir-menu").focus();
    });

    $("scrim").addEventListener("click", function () {
        gaveta(false);
    });

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") {
            gaveta(false);
        }
    });

    // ---------- Roteador ----------

    Korven.router.iniciar({
        view: $("view"),
        usuario: usuario,
        aoTrocar: function (rota, titulo) {
            $("titulo-pagina").textContent = titulo;
            marcarAtivo(rota);
            gaveta(false);
        }
    });

    document.body.classList.remove("boot");
})();
