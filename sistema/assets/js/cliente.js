// Shell do cliente (loja): portal leve, navegação em pílulas no topo e boas-vindas no Painel.
// Telas: Korven.views.

(function () {
    var usuario = Korven.auth.exigir(["cliente"]);

    if (!usuario) {
        return;
    }

    var $ = function (id) {
        return document.getElementById(id);
    };

    var nav = $("nav");
    var app = $("app");

    Korven.ui.ligarUsuario(usuario);

    // ---------- Navegação ----------

    Korven.menuDo("cliente").forEach(function (r) {
        var a = document.createElement("a");
        var rotulo = Korven.rotuloMenu(r, "cliente");

        a.href = "#/" + r.id;
        a.dataset.rota = r.id;
        a.innerHTML = Korven.icon(r.icone) + "<span></span>";
        a.querySelector("span").textContent = rotulo;
        nav.appendChild(a);
    });

    function marcarAtivo(rota) {
        var alvo = rota && (rota.pai || rota.id);

        nav.querySelectorAll("a").forEach(function (a) {
            var ativo = a.dataset.rota === alvo;

            a.classList.toggle("ativo", ativo);

            if (ativo) {
                a.setAttribute("aria-current", "page");
            } else {
                a.removeAttribute("aria-current");
            }
        });
    }

    // ---------- Faixa de boas-vindas ----------
    // Grande no Painel (saudação + atalho para nova entrega); nas demais telas, só o título.

    var eyebrow = $("hero-eyebrow");
    var titulo = $("hero-titulo");
    var sub = $("hero-sub");
    var cta = $("hero-cta");

    cta.innerHTML = Korven.icon("mais") + "<span>Nova entrega</span>";

    function faixa(rota, tituloPagina) {
        var painel = !!rota && rota.id === "painel";

        app.dataset.hero = painel ? "grande" : "compacto";
        eyebrow.innerHTML = painel ? Korven.icon("entregas") + "<span>Área do cliente</span>" : "";
        eyebrow.hidden = !painel;
        sub.hidden = !painel;
        cta.hidden = !(painel || (rota && rota.id === "entregas"));

        if (painel) {
            titulo.textContent = Korven.ui.saudacao() + ", " + usuario.nome + ".";
            sub.textContent = "Acompanhe suas entregas e crie novas em poucos cliques.";
        } else {
            titulo.textContent = tituloPagina;
        }
    }

    Korven.router.iniciar({
        view: $("view"),
        usuario: usuario,
        aoTrocar: function (rota, tituloPagina) {
            marcarAtivo(rota);
            faixa(rota, tituloPagina);
        }
    });

    document.body.classList.remove("boot");
})();
