//histórico de entrega: liga API, resumo e linha do tempo

(function (K) {
    "use strict";

    var $ = K.dom.$;
    var resumo = K.historico.resumo;
    var linha = K.historico.linha;
    var reduce = K.dom.reduce;

    var codigoAtual = null;
    var carregando = 0;

    // mostra uma entrega: troca com uma transição curta quando já havia outra na tela
    function mostrar(raw) {
        var seq = ++carregando;
        var primeira = codigoAtual === null;

        linha.parar();

        function pintar() {
            if (seq !== carregando) {
                return;
            }

            var m = K.historico.modelo(raw);

            codigoAtual = m.entrega.codigo_rastreamento;
            resumo.pintar(m);
            resumo.marcarLista(codigoAtual);

            window.scrollTo(0, 0);
            linha.montar(m);

            requestAnimationFrame(function () {
                document.body.classList.remove("swap");
            });
        }

        if (primeira || reduce) {
            pintar();
        } else {
            document.body.classList.add("swap");
            setTimeout(pintar, 380);
        }
    }

    function carregar(codigo) {
        return K.api.entregas.buscarPorCodigo(codigo).then(function (raw) {
            if (!raw) {
                K.aviso("Entrega não encontrada", "Confira o código de rastreio.", "erro");
                return;
            }

            mostrar(raw);
        }).catch(function (err) {
            K.aviso("Não foi possível carregar", err.message, "erro");
        });
    }

    function buscar(valor) {
        var codigo = String(valor || "").trim().toUpperCase();

        if (!codigo) {
            return;
        }

        if (codigo === codigoAtual) {
            linha.irParaAtual();
            return;
        }

        carregar(codigo);
    }

    function iniciar() {
        K.fundo.iniciar($("bg"));

        linha.iniciar({ fio: $("fio"), svg: $("fio-svg"), list: $("fio-list") });

        linha.aoFocar = resumo.marcarFoco;
        linha.aoReproduzir = function (tocando) {
            $("b-play").textContent = tocando ? "Parar" : "Reproduzir";
        };

        $("b-play").addEventListener("click", linha.reproduzir);
        $("b-now").addEventListener("click", linha.irParaAtual);

        $("dv-list").addEventListener("click", function (e) {
            var b = e.target.closest(".dv");

            if (b && b.getAttribute("aria-pressed") !== "true") {
                carregar(b.getAttribute("data-codigo"));
            }
        });

        $("hs-form").addEventListener("submit", function (e) {
            e.preventDefault();
            buscar($("hs-input").value);
            $("hs-input").value = "";
            $("hs-input").blur();
        });

        document.addEventListener("keydown", function (e) {
            var tag = (e.target.tagName || "").toLowerCase();

            if (e.key === "/" && tag !== "input" && tag !== "textarea") {
                e.preventDefault();
                $("hs-input").focus();
            }
        });

        // abre a entrega do código na URL (?codigo=KV-48213) ou a mais recente da lista
        K.api.entregas.listarRecentes().then(function (lista) {
            var pedido = new URLSearchParams(window.location.search).get("codigo");
            var codigo = pedido ? pedido.toUpperCase() : (lista[0] && lista[0].codigo_rastreamento);

            resumo.pintarLista(lista, codigo);

            if (codigo) {
                carregar(codigo);
            }
        }).catch(function (err) {
            K.aviso("Não foi possível carregar", err.message, "erro");
        });
    }

    // só abre com alguém logado; sem sessão, volta para o login do sistema
    K.sessao.carregar().then(function (ok) {
        if (!ok) {
            var c = new URLSearchParams(window.location.search).get("codigo");

            window.location.replace("index.html" + (c ? "#/entregas/" + encodeURIComponent(c) : ""));
            return;
        }

        K.menu.montar($("nav"), $("tabbar"), "entregas", "index.html");
        $("avatar").textContent = K.fmt.iniciais(K.sessao.usuario.nome);
        iniciar();
    }).catch(function () {
        window.location.replace("index.html");
    });

})(window.Korven);
