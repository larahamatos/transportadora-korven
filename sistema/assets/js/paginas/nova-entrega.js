//nova entrega: dados do pedido, destinatário, endereços e itens (mínimo 1)

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;

    // mesma regra do banco (criar_entrega): taxa fixa + valor por kg; só uma estimativa para a equipe
    var TAXA = 25;
    var POR_KG = 2.8;

    function itemHtml() {
        return '<div class="item-l"><div class="field"><label>Descrição</label><input data-k="descricao" placeholder="Ex.: Monitor 27&quot;" maxlength="120"></div>' +
            '<div class="field"><label>Qtd.</label><input data-k="quantidade" type="number" min="1" step="1" value="1" inputmode="numeric"></div>' +
            '<div class="field"><label>Peso (kg)</label><input data-k="peso" type="number" min="0" step="0.01" placeholder="0" inputmode="decimal"></div>' +
            '<div class="field"><label>Valor (R$)</label><input data-k="valor" type="number" min="0" step="0.01" placeholder="Opcional" inputmode="decimal"></div>' +
            '<button class="ib" type="button" data-rm aria-label="Remover item"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>';
    }

    K.paginas["nova-entrega"] = {
        titulo: "Nova entrega",

        render: function (el, ctx) {
            ctx.crumbs(["Entregas", "Nova entrega"]);

            el.innerHTML = '<div class="page-head rise"><div><a class="voltar" href="#/entregas">← Entregas</a><h1>Nova <em>entrega</em></h1></div></div>' +
                '<form class="det" id="nova" novalidate><div class="det-main">' +
                '<section class="card rise form" style="--i:1"><div class="card-h"><h2>Pedido</h2></div><div class="grid2">' +
                (S.staff ? '<div class="field"><label for="n-cliente">Cliente <i>*</i></label><select id="n-cliente" name="cliente_id" required><option value="">Carregando…</option></select></div>' : "") +
                '<div class="field"><label for="n-pedido">Código do pedido <i>*</i></label><input id="n-pedido" name="pedido" maxlength="60" placeholder="Ex.: LV-90417" required><span class="hint">Único por cliente. Se já existir, abrimos a entrega que já foi criada.</span></div>' +
                '<div class="field"><label for="n-prev">Data prevista</label><input id="n-prev" name="prevista" type="datetime-local"><span class="hint">Opcional. Sem data, vale o prazo padrão de 5 dias.</span></div></div></section>' +
                '<section class="card rise form" style="--i:2"><div class="card-h"><h2>Destinatário e endereços</h2></div><div class="grid2">' +
                '<div class="field"><label for="n-dest">Nome do destinatário <i>*</i></label><input id="n-dest" name="destinatario" maxlength="120" required></div>' +
                '<div class="field"><label for="n-doc">CPF/CNPJ do destinatário</label><input id="n-doc" name="documento" data-mask="doc" inputmode="numeric" placeholder="Opcional"></div>' +
                '<div class="field"><label for="n-orig">Endereço de origem <i>*</i></label><input id="n-orig" name="origem" placeholder="Cidade/UF ou endereço completo" required></div>' +
                '<div class="field"><label for="n-dst">Endereço de destino <i>*</i></label><input id="n-dst" name="destino" placeholder="Cidade/UF ou endereço completo" required></div></div></section>' +
                '<section class="card rise" style="--i:3"><div class="card-h"><h2>Itens</h2><button class="btn ghost sm" id="add-item" type="button">' + K.ui.icone("M12 5v14M5 12h14") + ' Adicionar item</button></div><div id="itens" class="itens"></div></section>' +
                '</div><aside class="det-side"><section class="card resumo rise" style="--i:2"><div class="card-h"><h2>Resumo</h2></div>' +
                '<dl class="dados um"><div class="dado"><dt>Itens</dt><dd id="r-itens">0</dd></div><div class="dado"><dt>Peso total</dt><dd id="r-peso">0 kg</dd></div>' +
                (S.staff ? '<div class="dado"><dt>Frete estimado</dt><dd id="r-frete" class="lime">' + K.fmt.moeda(TAXA) + "</dd></div>" : "") + "</dl>" +
                '<div class="form-err" id="ne-erro" role="alert"></div><button class="btn block" type="submit">Criar entrega</button>' +
                '<p class="mini">O código de rastreio é gerado automaticamente e o primeiro registro do histórico é aberto como <b>Solicitada</b>.</p></section></aside></form>';

            var form = el.querySelector("#nova");
            var box = el.querySelector("#itens");

            K.ui.mascaras(form);
            box.innerHTML = itemHtml();

            if (S.staff) {
                K.api.clientes.opcoes().then(function (l) {
                    el.querySelector("#n-cliente").innerHTML = '<option value="">Escolha o cliente…</option>' + l.map(function (c) {
                        return '<option value="' + c.id + '">' + esc(c.nome) + "</option>";
                    }).join("");
                });
            }

            function ler() {
                return Array.prototype.map.call(box.querySelectorAll(".item-l"), function (l) {
                    var v = function (k) { return l.querySelector('[data-k="' + k + '"]').value.trim(); };

                    return { linha: l, descricao: v("descricao"), quantidade: parseInt(v("quantidade"), 10), peso: v("peso") === "" ? NaN : Number(v("peso")), valor_declarado: v("valor") === "" ? null : Number(v("valor")) };
                });
            }

            function resumo() {
                var l = ler();
                var q = 0;
                var p = 0;

                l.forEach(function (i) {
                    q += i.quantidade > 0 ? i.quantidade : 0;
                    p += i.peso > 0 ? i.peso : 0;
                });

                el.querySelector("#r-itens").textContent = q;
                el.querySelector("#r-peso").textContent = K.fmt.num(p) + " kg";

                if (S.staff) {
                    el.querySelector("#r-frete").textContent = K.fmt.moeda(TAXA + POR_KG * p);
                }
            }

            box.addEventListener("input", resumo);

            box.addEventListener("click", function (e) {
                if (e.target.closest("[data-rm]")) {
                    if (box.children.length > 1) {
                        e.target.closest(".item-l").remove();
                        resumo();
                    } else {
                        K.aviso("Mantenha ao menos um item", "Toda entrega precisa de carga.", "erro");
                    }
                }
            });

            el.querySelector("#add-item").addEventListener("click", function () {
                box.insertAdjacentHTML("beforeend", itemHtml());
                box.lastElementChild.querySelector("input").focus();
                resumo();
            });

            resumo();

            form.addEventListener("submit", function (e) {
                e.preventDefault();

                var erro = el.querySelector("#ne-erro");
                var v = K.ui.valores(form);
                var lista = ler();
                var invalido = null;

                erro.textContent = "";
                form.querySelectorAll(".field.erro").forEach(function (f) { f.classList.remove("erro"); });
                form.querySelectorAll(".field .msg").forEach(function (m) { m.remove(); });

                function falha(input, msg) {
                    K.ui.marcarErro(input, msg);
                    invalido = invalido || input;
                }

                if (S.staff && !v.cliente_id) {
                    falha(form.cliente_id, "Escolha o cliente.");
                }

                if (!v.pedido) {
                    falha(form.pedido, "Informe o código do pedido.");
                }

                if (!v.destinatario) {
                    falha(form.destinatario, "Informe o destinatário.");
                }

                if (!v.origem) {
                    falha(form.origem, "Informe a origem.");
                }

                if (!v.destino) {
                    falha(form.destino, "Informe o destino.");
                }

                var doc = K.fmt.digitos(v.documento).length;

                if (v.documento && doc !== 11 && doc !== 14) {
                    falha(form.documento, "CPF tem 11 dígitos e CNPJ, 14.");
                }

                if (v.prevista && new Date(v.prevista) <= new Date()) {
                    falha(form.prevista, "A data prevista precisa ser futura.");
                }

                lista.forEach(function (i) {
                    var campos = i.linha.querySelectorAll("input");

                    if (!i.descricao) {
                        falha(campos[0], "Obrigatório.");
                    }

                    if (!(i.quantidade > 0)) {
                        falha(campos[1], "Maior que 0.");
                    }

                    if (isNaN(i.peso) || i.peso < 0) {
                        falha(campos[2], "Informe o peso.");
                    }
                });

                if (invalido) {
                    erro.textContent = "Confira os campos destacados.";
                    invalido.focus();
                    return;
                }

                var btn = form.querySelector("[type=submit]");

                K.ui.ocupado(btn, K.api.entregas.criar({
                    cliente_id: v.cliente_id,
                    codigo_pedido_externo: v.pedido,
                    nome_destinatario: v.destinatario,
                    documento_destinatario: v.documento,
                    endereco_origem: v.origem,
                    endereco_destino: v.destino,
                    data_prevista: v.prevista ? new Date(v.prevista).toISOString() : null,
                    itens: lista.map(function (i) {
                        return { descricao: i.descricao, quantidade: i.quantidade, peso: i.peso, valor_declarado: i.valor_declarado };
                    })
                })).then(function (r) {
                    if (r.duplicada) {
                        K.aviso("Pedido já cadastrado", "Abrimos a entrega " + r.codigo_rastreamento + ", criada antes.", "erro");
                    } else {
                        K.aviso("Entrega criada", "Código de rastreio " + r.codigo_rastreamento);
                    }

                    window.location.hash = "#/entregas/" + r.codigo_rastreamento;
                }).catch(function (err) {
                    erro.textContent = err.message;
                });
            });
        }
    };

})(window.Korven);
