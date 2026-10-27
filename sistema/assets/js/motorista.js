// Shell do motorista: pensado para celular, uso com uma mão. Barra de abas embaixo com o botão
// central "Atualizar status" (a ação mais frequente). Telas: Korven.views.

(function () {
    var usuario = Korven.auth.exigir(["motorista"]);

    if (!usuario) {
        return;
    }

    var $ = function (id) {
        return document.getElementById(id);
    };

    var tabbar = $("tabbar");
    var ind = $("ind");
    var itens = [];

    Korven.ui.ligarUsuario(usuario);
    $("saudacao").textContent = Korven.ui.saudacao();
    $("nome").textContent = Korven.ui.primeiroNome(usuario.nome);

    // ---------- Barra de abas: metade das rotas do menu, botão de status no meio, resto ----------

    function aba(r, classe) {
        var a = document.createElement("a");

        a.href = "#/" + r.id;
        a.dataset.rota = r.id;
        a.className = classe;
        a.innerHTML = Korven.icon(r.icone) + "<span></span>";
        a.querySelector("span").textContent = classe === "tab" ? r.titulo : "Status";
        a.setAttribute("aria-label", r.titulo);

        return a;
    }

    var rotas = Korven.menuDo("motorista");
    var meio = Math.ceil(rotas.length / 2);

    rotas.forEach(function (r, i) {
        if (i === meio) {
            itens.push(tabbar.appendChild(aba(Korven.rota("status"), "fab")));
        }

        itens.push(tabbar.appendChild(aba(r, "tab")));
    });

    function marcarAtivo(rota) {
        var ativa = null;

        itens.forEach(function (a) {
            var ativo = !!rota && (a.dataset.rota === rota.id || (a.classList.contains("tab") && a.dataset.rota === rota.pai));

            a.classList.toggle("ativo", ativo);

            if (ativo) {
                a.setAttribute("aria-current", "page");
                ativa = a;
            } else {
                a.removeAttribute("aria-current");
            }
        });

        posicionar(ativa);
    }

    // O brilho que desliza por baixo da aba ativa (o botão central tem destaque próprio).
    var atual = null;

    function posicionar(a) {
        atual = a && a.classList.contains("tab") ? a : null;

        if (!atual) {
            ind.style.opacity = "0";
            return;
        }

        ind.style.opacity = "1";
        ind.style.width = atual.offsetWidth + "px";
        ind.style.transform = "translateX(" + atual.offsetLeft + "px)";
    }

    window.addEventListener("resize", function () {
        posicionar(atual);
    });

    Korven.router.iniciar({
        view: $("view"),
        usuario: usuario,
        aoTrocar: function (rota) {
            marcarAtivo(rota);
        }
    });

    document.body.classList.remove("boot");
    posicionar(atual); // já visível, agora as medidas são reais
})();
