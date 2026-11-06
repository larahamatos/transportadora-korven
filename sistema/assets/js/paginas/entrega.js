//entrega: detalhe, ações (atualizar status, atribuir motorista) e histórico resumido

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;

    var ACAO = {
        coletada: "Confirmar coleta",
        saiu_cd: "Registrar saída do CD",
        em_rodovia: "Iniciar viagem",
        na_cidade: "Cheguei à cidade de destino",
        saiu_entrega: "Saí para entrega",
        entregue: "Confirmar entrega"
    };

    function dado(rotulo, valor, extra) {
        return '<div class="dado' + (extra || "") + '"><dt>' + rotulo + "</dt><dd>" + (valor == null || valor === "" ? "—" : valor) + "</dd></div>";
    }

    function trilho(status) {
        var atual = K.status.ordem.indexOf(status);

        return '<ol class="trilho" aria-label="Progresso da entrega">' + K.status.ordem.map(function (s, i) {
            return '<li class="' + (i < atual ? "feito" : i === atual ? "atual" : "") + '"><i></i><span>' + K.status.rotulo[s] + "</span></li>";
        }).join("") + "</ol>";
    }

    function historico(lista) {
        return '<ol class="hist">' + lista.slice().reverse().map(function (h) {
            return "<li><i></i><div><b>" + K.status.rotulo[h.status_novo] + "</b><time>" + K.fmt.dataHora(new Date(h.data_alteracao)) + "</time>" +
                (h.observacao ? "<p>" + esc(h.observacao) + "</p>" : "") +
                (h.usuario ? "<small>" + esc(h.usuario.nome) + " · " + (K.status.perfil[h.usuario.perfil] || esc(h.usuario.perfil)) + "</small>" : "") + "</div></li>";
        }).join("") + "</ol>";
    }

    function itens(lista) {
        var q = 0;
        var p = 0;

        lista.forEach(function (i) {
            q += i.quantidade;
            p += Number(i.peso);
        });

        return '<table class="tbl"><thead><tr><th>Item</th><th class="num">Qtd.</th><th class="num">Peso</th>' + (S.staff ? '<th class="num">Valor declarado</th>' : "") + "</tr></thead><tbody>" +
            lista.map(function (i) {
                return '<tr><td data-l="Item" class="full strong">' + esc(i.descricao) + '</td><td data-l="Qtd." class="num">' + i.quantidade + '</td><td data-l="Peso" class="num">' + K.fmt.num(Number(i.peso)) + " kg</td>" +
                    (S.staff ? '<td data-l="Valor declarado" class="num">' + (i.valor_declarado == null ? "—" : K.fmt.moeda(i.valor_declarado)) + "</td>" : "") + "</tr>";
            }).join("") + "</tbody></table>" +
            '<div class="pag"><span>' + q + (q === 1 ? " unidade" : " unidades") + "</span><span>Peso total · " + K.fmt.num(p) + " kg</span></div>";
    }

    K.paginas.entrega = {
        titulo: function (ctx) {
            return ctx.caminho[1] || "Entrega";
        },

        render: function (el, ctx) {
            var codigo = ctx.caminho[1].toUpperCase();

            ctx.crumbs(["Entregas", codigo]);
            el.innerHTML = K.ui.carregando(6);

            function carregar() {
                return K.api.entregas.detalhe(codigo).then(function (d) {
                    if (!d) {
                        el.innerHTML = '<div class="card">' + K.ui.vazio("Entrega não encontrada", "Confira o código ou volte para a lista.", '<a class="btn ghost sm" href="#/entregas">Ver entregas</a>', "busca") + "</div>";
                        return;
                    }

                    pintar(d);
                });
            }

            function pintar(d) {
                var e = d.entrega;
                var sla = K.fmt.situacao(e.data_prevista, e.data_conclusao);
                var prox = d.acoes.proximo_status;
                var motorista = S.pode("motorista");

                el.innerHTML = '<div class="page-head rise"><div><a class="voltar" href="#/entregas">← ' + (motorista ? "Minhas entregas" : "Entregas") + "</a><h1>" + esc(e.codigo_rastreamento) + "</h1></div>" +
                    '<div class="head-tags">' + K.status.chip(e.status) + '<span class="tag ' + (sla.tipo === "late" ? "late" : "ok") + '">' + sla.texto + "</span></div></div>" +
                    '<div class="det">' +
                    '<div class="det-main">' +
                    '<section class="card rise" style="--i:1"><div class="rota"><div><small>Origem</small><b>' + esc(e.endereco_origem) + '</b></div><svg viewBox="0 0 48 12" aria-hidden="true"><path d="M0 6h44M38 1l6 5-6 5"/></svg><div><small>Destino</small><b>' + esc(e.endereco_destino) + "</b></div></div>" + trilho(e.status) + "</section>" +
                    '<section class="card rise" style="--i:2"><div class="card-h"><h2>Dados da entrega</h2></div><dl class="dados">' +
                    dado("Destinatário", esc(e.nome_destinatario)) + dado("Documento", e.documento_destinatario ? esc(e.documento_destinatario) : "") +
                    dado("Pedido", esc(e.codigo_pedido_externo)) + (e.cliente ? dado("Cliente", esc(e.cliente.nome)) : "") +
                    dado("Solicitada em", K.fmt.dataHora(new Date(e.data_solicitacao))) + dado(e.data_conclusao ? "Concluída em" : "Previsão", K.fmt.dataHora(new Date(e.data_conclusao || e.data_prevista))) +
                    (S.staff ? dado("Motorista", e.motorista ? esc(e.motorista.nome) + (e.motorista.telefone ? '<small class="sub"> · ' + esc(e.motorista.telefone) + "</small>" : "") : '<span class="tag nodrv">Sem motorista</span>') + dado("Frete", K.fmt.moeda(e.valor_frete)) : "") +
                    "</dl></section>" +
                    '<section class="card tbl-wrap rise" style="--i:3"><div class="card-h" style="padding:22px 24px 0"><h2>Carga</h2></div>' + itens(d.itens) + "</section>" +
                    "</div>" +
                    '<aside class="det-side">' +
                    (prox ? '<section class="card acao rise" style="--i:2"><div class="card-h"><h2>Próximo passo</h2></div><p class="acao-t">Registrar <b>' + K.status.rotulo[prox] + '</b></p><div class="field"><label for="obs">Observação <small>(opcional)</small></label><textarea id="obs" maxlength="500" placeholder="Ex.: carga conferida, sem avarias"></textarea></div><div class="form-err" id="acao-erro" role="alert"></div><button class="btn block" id="b-avancar" type="button">' + ACAO[prox] + "</button></section>" : "") +
                    (d.acoes.pode_atribuir ? '<section class="card rise" style="--i:3"><div class="card-h"><h2>Motorista</h2></div><div class="field"><select id="mot" aria-label="Motorista"><option value="">Carregando…</option></select></div><button class="btn ghost block" id="b-atribuir" type="button" style="margin-top:12px">Atribuir motorista</button></section>' : "") +
                    '<section class="card rise" style="--i:4"><div class="card-h"><h2>Histórico</h2><a class="link" href="historico-entrega.html?codigo=' + encodeURIComponent(e.codigo_rastreamento) + '">Linha do tempo completa</a></div>' + historico(d.historico) + "</section>" +
                    "</aside></div>";

                var bAv = el.querySelector("#b-avancar");

                if (bAv) {
                    bAv.addEventListener("click", function () {
                        var obs = el.querySelector("#obs").value.trim();
                        var ir = prox === "entregue" ? K.ui.confirmar("Confirmar a entrega?", "Isso conclui a entrega " + e.codigo_rastreamento + " e não pode ser desfeito pelo seu perfil.", "Confirmar entrega") : Promise.resolve(true);

                        ir.then(function (sim) {
                            if (!sim) {
                                return;
                            }

                            return K.ui.ocupado(bAv, K.api.entregas.avancar(e.id, obs)).then(function () {
                                K.aviso(K.status.rotulo[prox], e.codigo_rastreamento + " atualizada.");
                                return carregar();
                            });
                        }).catch(function (err) {
                            el.querySelector("#acao-erro").textContent = err.message;
                        });
                    });
                }

                var sel = el.querySelector("#mot");

                if (sel) {
                    K.api.motoristas.listar().then(function (lista) {
                        sel.innerHTML = '<option value="">— sem motorista —</option>' + lista.map(function (m) {
                            var atual = e.motorista && e.motorista.id === m.id;

                            return '<option value="' + m.id + '"' + (atual ? " selected" : "") + (m.disponibilidade === "indisponivel" && !atual ? " disabled" : "") + ">" + esc(m.nome) + " · " + K.status.disp[m.disponibilidade] + "</option>";
                        }).join("");
                    });

                    el.querySelector("#b-atribuir").addEventListener("click", function (ev) {
                        K.ui.ocupado(ev.currentTarget, K.api.entregas.atribuir(e.id, sel.value)).then(function () {
                            K.aviso(sel.value ? "Motorista atribuído" : "Motorista removido", e.codigo_rastreamento);
                            return carregar();
                        }).catch(function (err) {
                            K.aviso("Não foi possível atribuir", err.message, "erro");
                        });
                    });
                }

                if (motorista) {
                    el.classList.add("modo-motorista");
                }
            }

            return carregar();
        }
    };

})(window.Korven);
