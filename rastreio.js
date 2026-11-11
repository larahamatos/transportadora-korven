//rastreio público: consulta o andamento de uma entrega pelo código (função rastrear_publico do Supabase)
//
// A função devolve só status e datas das etapas: sem nomes, endereços, documentos ou valores.

(function () {
    "use strict";

    var API = ((window.KORVEN_ENV || {}).url) + "/rest/v1/rpc/rastrear_publico";
    var CHAVE = (window.KORVEN_ENV || {}).chave;
    var ATUALIZA_A_CADA = 60000;

    var ETAPAS = [
        { s: "solicitada", titulo: "Pedido recebido", texto: "Recebemos o pedido e vamos agendar a coleta." },
        { s: "coletada", titulo: "Carga coletada", texto: "A carga foi retirada e segue para o centro de distribuição." },
        { s: "saiu_cd", titulo: "Saiu do centro de distribuição", texto: "Conferida e despachada, a carga está pronta para a estrada." },
        { s: "em_rodovia", titulo: "Em viagem pela rodovia", texto: "A carga está em trânsito rumo à cidade de destino." },
        { s: "na_cidade", titulo: "Chegou à cidade de destino", texto: "Em breve ela sai para a entrega final." },
        { s: "saiu_entrega", titulo: "Saiu para entrega", texto: "O motorista está a caminho do endereço de entrega." },
        { s: "entregue", titulo: "Entregue", texto: "A entrega foi concluída." }
    ];

    var $ = function (id) { return document.getElementById(id); };
    var form = $("rs-form");
    var input = $("rs-code");
    var out = $("rs-out");
    var msg = $("rs-msg");
    var box = $("rs-box");
    var MSG_PADRAO = msg.innerHTML;

    var atual = null;       // código na tela
    var timer = 0;
    var seq = 0;

    function esc(t) {
        return String(t).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; });
    }

    function pad(n) { return n < 10 ? "0" + n : "" + n; }

    function quando(iso) {
        var d = new Date(iso);

        return d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }).replace(".", "") + " · " + pad(d.getHours()) + ":" + pad(d.getMinutes());
    }

    function ha(iso) {
        var m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 6e4));

        if (m < 1) { return "agora mesmo"; }
        if (m < 60) { return "há " + m + " min"; }
        if (m < 1440) { return "há " + Math.floor(m / 60) + " h"; }

        return "há " + Math.floor(m / 1440) + (m < 2880 ? " dia" : " dias");
    }

    // aceita "kv48213", "KV 48213", " kv-48213 " e devolve KV-48213 (ou null se não parecer um código)
    function normalizar(v) {
        var t = String(v || "").toUpperCase().replace(/\s+/g, "");
        var m = /^KV-?(\d{4,8})$/.exec(t);

        return m ? "KV-" + m[1] : null;
    }

    function aviso(texto, erro) {
        msg.innerHTML = texto;
        box.classList.toggle("erro", !!erro);
        msg.classList.toggle("erro", !!erro);
    }

    // ---------- buscas recentes ----------

    function recentes(novo) {
        var l = [];

        try {
            l = JSON.parse(localStorage.getItem("korven.rastreios") || "[]");
        } catch (e) {
            l = [];
        }

        if (novo) {
            l = [novo].concat(l.filter(function (x) { return x !== novo; })).slice(0, 4);

            try {
                localStorage.setItem("korven.rastreios", JSON.stringify(l));
            } catch (e) { /* sem armazenamento: só não lembra */ }
        }

        return l;
    }

    function pintarRecentes() {
        var l = recentes();
        var el = $("rs-recent");

        el.hidden = !l.length;
        el.innerHTML = l.length ? "<span>Buscas recentes</span>" + l.map(function (c) { return '<button type="button" data-c="' + esc(c) + '">' + esc(c) + "</button>"; }).join("") : "";
    }

    // ---------- consulta ----------

    function consultar(codigo) {
        return fetch(API, {
            method: "POST",
            headers: { "apikey": CHAVE, "Authorization": "Bearer " + CHAVE, "Content-Type": "application/json" },
            body: JSON.stringify({ p_codigo: codigo })
        }).then(function (r) {
            if (!r.ok) {
                throw new Error("falha");
            }

            return r.json();
        });
    }

    function carregando() {
        out.innerHTML = '<div class="rs-card rs-sk" aria-busy="true"><i></i><i></i><i></i><i></i></div>';
    }

    function naoAchou(codigo) {
        out.innerHTML = '<div class="rs-card rs-vazio"><div class="rs-ico">?</div><h2>Não encontramos o código ' + esc(codigo) + "</h2>" +
            "<p>Confira se digitou todos os números. Se o código veio da sua nota fiscal ou do e-mail de confirmação e mesmo assim não aparece, fale com a loja onde você comprou.</p></div>";
    }

    function falhou(codigo) {
        out.innerHTML = '<div class="rs-card rs-vazio"><div class="rs-ico">!</div><h2>Não conseguimos consultar agora</h2><p>Verifique sua conexão e tente de novo em instantes.</p>' +
            '<button class="btn" type="button" data-tentar="' + esc(codigo) + '">Tentar de novo</button></div>';
    }

    function pintar(d) {
        var i = Math.max(0, ETAPAS.map(function (e) { return e.s; }).indexOf(d.status));
        var e = ETAPAS[i];
        var feito = d.status === "entregue";
        var datas = {};

        d.etapas.forEach(function (x) { datas[x.status] = x.data_alteracao; });

        var ultima = d.etapas.length ? d.etapas[d.etapas.length - 1].data_alteracao : null;
        var atrasada = !feito && new Date(d.data_prevista) < new Date();
        var concluida = datas.entregue ? new Date(datas.entregue) : null;
        var noPrazo = feito && concluida && concluida <= new Date(d.data_prevista);
        var pct = Math.round(((i + 1) / ETAPAS.length) * 100);

        var etapas = ETAPAS.map(function (x, k) {
            var estado = k < i || (feito && k === i) ? "feito" : k === i ? "atual" : "falta";

            return '<li class="' + estado + '"><span class="rs-dot" aria-hidden="true"></span><div class="rs-etapa"><b>' + x.titulo + (estado === "atual" ? ' <em>agora</em>' : "") + "</b>" +
                (estado !== "falta" ? "<p>" + x.texto + "</p>" : "") + "</div>" +
                '<time class="rs-data">' + (datas[x.s] ? quando(datas[x.s]) : "") + "</time></li>";
        }).join("");

        out.innerHTML = '<article class="rs-card" data-fim="' + feito + '">' +
            '<header><div><span class="rs-label">Código de rastreio</span><strong class="rs-cod">' + esc(d.codigo_rastreamento) + '</strong></div>' +
            '<span class="rs-pill ' + (feito ? "ok" : "") + '">' + (feito ? "Concluída" : "Em andamento") + "</span></header>" +
            '<div class="rs-now"><h2>' + e.titulo + "</h2><p>" + e.texto + "</p></div>" +
            '<div class="rs-prog" role="img" aria-label="Etapa ' + (i + 1) + ' de ' + ETAPAS.length + '"><i style="--p:' + pct + '%"></i></div>' +
            '<dl class="rs-info"><div><dt>' + (feito ? "Entregue em" : atrasada ? "Previsão original" : "Previsão de entrega") + "</dt><dd>" + quando(feito && concluida ? concluida : d.data_prevista) + "</dd></div>" +
            "<div><dt>Última atualização</dt><dd>" + (ultima ? ha(ultima) : "—") + "</dd></div>" +
            "<div><dt>Etapa</dt><dd>" + (i + 1) + " de " + ETAPAS.length + "</dd></div></dl>" +
            (atrasada ? '<p class="rs-aviso">Passamos da previsão original, mas sua carga segue em andamento. Esta página se atualiza sozinha.</p>' : "") +
            (feito ? '<p class="rs-aviso ok">' + (noPrazo ? "Entregue dentro do prazo previsto." : "Entrega concluída.") + "</p>" : "") +
            '<ol class="rs-steps">' + etapas + "</ol>" +
            '<footer><button class="btn ghost" type="button" data-copiar>Copiar link</button><button class="btn ghost" type="button" data-atualizar>Atualizar agora</button>' +
            '<span class="rs-hora">Atualizado às ' + pad(new Date().getHours()) + ":" + pad(new Date().getMinutes()) + "</span></footer></article>";
    }

    function rastrear(codigo, silencioso) {
        var n = ++seq;

        clearTimeout(timer);
        atual = codigo;

        if (!silencioso) {
            carregando();
        }

        return consultar(codigo).then(function (d) {
            if (n !== seq) {
                return;
            }

            if (!d) {
                naoAchou(codigo);
                return;
            }

            pintar(d);
            recentes(d.codigo_rastreamento);
            pintarRecentes();

            if (d.status !== "entregue") {
                timer = setTimeout(function () {
                    if (!document.hidden) {
                        rastrear(codigo, true);
                    } else {
                        agendarAoVoltar(codigo);
                    }
                }, ATUALIZA_A_CADA);
            }
        }).catch(function () {
            if (n === seq && !silencioso) {
                falhou(codigo);
            }
        });
    }

    function agendarAoVoltar(codigo) {
        function volta() {
            if (!document.hidden) {
                document.removeEventListener("visibilitychange", volta);

                if (atual === codigo) {
                    rastrear(codigo, true);
                }
            }
        }

        document.addEventListener("visibilitychange", volta);
    }

    function buscar(valor) {
        var c = normalizar(valor);

        if (!c) {
            aviso(valor.trim() ? "Esse código não parece válido. Ele começa com <b>KV-</b> seguido de números, como <b>KV-48213</b>." : "Digite o código de rastreio para continuar.", true);
            input.focus();
            return;
        }

        aviso(MSG_PADRAO, false);
        input.value = c;
        history.replaceState(null, "", "?codigo=" + encodeURIComponent(c));
        document.title = c + " · Rastreio Korven";
        rastrear(c);
    }

    // ---------- eventos ----------

    form.addEventListener("submit", function (e) {
        e.preventDefault();
        buscar(input.value);
    });

    input.addEventListener("input", function () {
        if (box.classList.contains("erro")) {
            aviso(MSG_PADRAO, false);
        }
    });

    $("rs-recent").addEventListener("click", function (e) {
        var b = e.target.closest("[data-c]");

        if (b) {
            buscar(b.getAttribute("data-c"));
        }
    });

    out.addEventListener("click", function (e) {
        var t = e.target.closest("[data-tentar]");

        if (t) {
            rastrear(t.getAttribute("data-tentar"));
        } else if (e.target.closest("[data-atualizar]") && atual) {
            rastrear(atual);
        } else if (e.target.closest("[data-copiar]")) {
            var url = location.origin + location.pathname + "?codigo=" + encodeURIComponent(atual);
            var b = e.target.closest("[data-copiar]");

            function feito() {
                b.textContent = "Link copiado";
                setTimeout(function () { b.textContent = "Copiar link"; }, 2000);
            }

            if (navigator.clipboard && window.isSecureContext) {
                navigator.clipboard.writeText(url).then(feito, function () { window.prompt("Copie o link:", url); });
            } else {
                window.prompt("Copie o link:", url);
            }
        }
    });

    // ---------- início ----------

    pintarRecentes();

    var pedido = new URLSearchParams(location.search).get("codigo");

    if (pedido) {
        input.value = pedido;
        buscar(pedido);
    }
})();
