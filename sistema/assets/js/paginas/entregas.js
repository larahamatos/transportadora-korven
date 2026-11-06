//entregas: lista com busca, filtros e paginação (cada perfil vê o seu escopo; o RLS garante)

(function (K) {
    "use strict";

    var esc = K.dom.esc;
    var S = K.sessao;
    var POR_PAGINA = 12;

    function linha(e) {
        var atrasada = e.status !== "entregue" && new Date(e.data_prevista) < new Date();
        var semMot = S.staff && !e.motorista_id && e.status !== "entregue";
        var badges = (atrasada ? '<span class="tag late">Atrasada</span> ' : "") + (semMot ? '<span class="tag nodrv">Sem motorista</span>' : "");

        return '<tr data-href="#/entregas/' + esc(e.codigo_rastreamento) + '">' +
            '<td data-l="Entrega"><span class="code">' + esc(e.codigo_rastreamento) + '</span><span class="sub">Pedido ' + esc(e.codigo_pedido_externo) + "</span></td>" +
            '<td data-l="Destinatário"><span class="strong">' + esc(e.nome_destinatario) + '</span><span class="sub">' + esc(e.endereco_origem) + " → " + esc(e.endereco_destino) + "</span></td>" +
            (S.staff ? '<td data-l="Cliente">' + esc(e.cliente ? e.cliente.nome : "—") + '</td><td data-l="Motorista">' + (e.motorista ? esc(e.motorista.nome) : '<span class="sub">—</span>') + "</td>" : "") +
            '<td data-l="Situação" class="full">' + K.status.chip(e.status) + (badges ? "<br>" + badges : "") + "</td>" +
            '<td data-l="' + (e.status === "entregue" ? "Entregue em" : "Previsão") + '"' + (atrasada ? ' class="late"' : "") + ">" + K.fmt.dataHora(new Date(e.data_conclusao || e.data_prevista)) + "</td></tr>";
    }

    K.paginas.entregas = {
        titulo: function () {
            return S.pode("motorista") ? "Minhas entregas" : "Entregas";
        },

        render: function (el, ctx) {
            var motorista = S.pode("motorista");
            var q = ctx.query;
            var f = {
                busca: q.busca || "",
                status: q.status || "",
                cliente: q.cliente || "",
                motorista: q.motorista || "",
                de: q.de || "",
                ate: q.ate || "",
                atrasadas: q.f === "atrasadas",
                semMotorista: q.f === "semmotorista",
                andamento: q.f === "andamento" || (motorista && q.status !== "entregue" && !q.status),
                ordem: motorista ? "prevista" : "",
                pagina: Number(q.pagina) || 1,
                porPagina: POR_PAGINA
            };

            if (motorista && q.todas) {
                f.andamento = false;
            }

            var colunas = S.staff ? 6 : 4;
            var ultimo = 0;
            var timer = 0;

            el.innerHTML = '<div class="page-head rise"><div><p class="eyebrow">' + (motorista ? "Rota do dia" : "Operação") + "</p><h1>" + (motorista ? "Minhas <em>entregas</em>" : "<em>Entregas</em>") + "</h1></div>" +
                (motorista ? "" : '<div class="head-acts"><a class="btn" href="#/entregas/nova">' + K.ui.icone("M12 5v14M5 12h14") + " Nova entrega</a></div>") + "</div>" +
                '<section class="card rise" style="--i:1"><div class="bar" id="filtros">' +
                '<div class="search grow">' + K.ui.icone("M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2") + '<input class="inp" id="f-busca" type="search" placeholder="Buscar por código, pedido ou destinatário" value="' + esc(f.busca) + '" autocomplete="off"></div>' +
                '<select class="inp" id="f-status" aria-label="Status"><option value="">Todos os status</option>' + K.status.opcoes(f.status) + "</select>" +
                (motorista ? "" : '<input class="inp" id="f-de" type="date" aria-label="De" value="' + f.de + '"><input class="inp" id="f-ate" type="date" aria-label="Até" value="' + f.ate + '">') +
                (S.staff ? '<select class="inp" id="f-cliente" aria-label="Cliente"><option value="">Todos os clientes</option></select><select class="inp" id="f-motorista" aria-label="Motorista"><option value="">Todos os motoristas</option></select>' : "") +
                "</div>" +
                '<div class="bar" style="margin-top:12px"><button class="fchip" id="c-atrasadas" type="button">Atrasadas</button>' +
                (S.staff ? '<button class="fchip" id="c-sem" type="button">Sem motorista</button>' : "") +
                '<button class="fchip" id="c-andamento" type="button">' + (motorista ? "Só em andamento" : "Em andamento") + '</button><button class="link" id="c-limpar" type="button" style="margin-left:auto">Limpar filtros</button></div></section>' +
                '<section class="card tbl-wrap rise" style="--i:2"><div id="lista">' + K.ui.carregando(6) + "</div></section>";

            var lista = el.querySelector("#lista");
            var $f = function (id) { return el.querySelector("#" + id); };

            function sincronizarChips() {
                $f("c-atrasadas").setAttribute("aria-pressed", String(f.atrasadas));
                $f("c-andamento").setAttribute("aria-pressed", String(f.andamento));

                if (S.staff) {
                    $f("c-sem").setAttribute("aria-pressed", String(f.semMotorista));
                }
            }

            function url() {
                var p = new URLSearchParams();

                ["busca", "status", "cliente", "motorista", "de", "ate"].forEach(function (k) {
                    if (f[k]) {
                        p.set(k, f[k]);
                    }
                });

                if (f.atrasadas) {
                    p.set("f", "atrasadas");
                } else if (f.semMotorista) {
                    p.set("f", "semmotorista");
                } else if (f.andamento && !motorista) {
                    p.set("f", "andamento");
                }

                if (f.pagina > 1) {
                    p.set("pagina", f.pagina);
                }

                var s = p.toString();

                history.replaceState(null, "", "#/entregas" + (s ? "?" + s : ""));
            }

            function carregar() {
                var n = ++ultimo;

                url();
                sincronizarChips();
                lista.style.opacity = "0.55";

                return K.api.entregas.listar(f).then(function (r) {
                    if (n !== ultimo) {
                        return;
                    }

                    lista.style.opacity = "";

                    if (!r.linhas.length) {
                        var filtrando = f.busca || f.status || f.cliente || f.motorista || f.de || f.ate || f.atrasadas || f.semMotorista || (f.andamento && !motorista);

                        lista.innerHTML = K.ui.vazio(filtrando ? "Nada encontrado" : (motorista ? "Nenhuma entrega para você agora" : "Nenhuma entrega ainda"),
                            filtrando ? "Ajuste a busca ou limpe os filtros." : (motorista ? "Quando o operador atribuir uma carga, ela aparece aqui." : "Crie a primeira entrega para começar."),
                            filtrando ? "" : (motorista ? "" : '<a class="btn" href="#/entregas/nova">Nova entrega</a>'), "busca");
                        return;
                    }

                    var paginas = Math.ceil(r.total / POR_PAGINA);
                    var de = (f.pagina - 1) * POR_PAGINA + 1;

                    lista.innerHTML = '<table class="tbl"><thead><tr><th>Entrega</th><th>Destinatário</th>' + (S.staff ? "<th>Cliente</th><th>Motorista</th>" : "") + "<th>Situação</th><th>Previsão</th></tr></thead><tbody>" +
                        r.linhas.map(linha).join("") + "</tbody></table>" +
                        '<div class="pag"><span>' + de + "–" + (de + r.linhas.length - 1) + " de " + r.total + '</span><div><button class="btn ghost sm" id="p-ant" type="button"' + (f.pagina <= 1 ? " disabled" : "") + '>Anterior</button><button class="btn ghost sm" id="p-prox" type="button"' + (f.pagina >= paginas ? " disabled" : "") + ">Próxima</button></div></div>";
                }).catch(function (e) {
                    if (n === ultimo) {
                        lista.style.opacity = "";
                        lista.innerHTML = K.ui.falha(e, true);
                    }
                });
            }

            function mudou() {
                f.pagina = 1;
                carregar();
            }

            // listas dos selects (só admin/operador)
            if (S.staff) {
                Promise.all([K.api.clientes.opcoes(), K.api.motoristas.listar()]).then(function (r) {
                    $f("f-cliente").insertAdjacentHTML("beforeend", r[0].map(function (c) { return '<option value="' + c.id + '"' + (c.id === f.cliente ? " selected" : "") + ">" + esc(c.nome) + "</option>"; }).join(""));
                    $f("f-motorista").insertAdjacentHTML("beforeend", r[1].map(function (m) { return '<option value="' + m.id + '"' + (m.id === f.motorista ? " selected" : "") + ">" + esc(m.nome) + "</option>"; }).join(""));
                }).catch(function () { /* os filtros por cliente/motorista só ficam sem opções */ });
            }

            $f("f-busca").addEventListener("input", function (e) {
                clearTimeout(timer);
                timer = setTimeout(function () {
                    f.busca = e.target.value.trim();
                    mudou();
                }, 300);
            });

            $f("filtros").addEventListener("change", function (e) {
                var mapa = { "f-status": "status", "f-cliente": "cliente", "f-motorista": "motorista", "f-de": "de", "f-ate": "ate" };

                if (mapa[e.target.id]) {
                    f[mapa[e.target.id]] = e.target.value;
                    mudou();
                }
            });

            function alternar(chave, outras) {
                return function () {
                    f[chave] = !f[chave];
                    (outras || []).forEach(function (o) { f[o] = false; });
                    mudou();
                };
            }

            $f("c-atrasadas").addEventListener("click", alternar("atrasadas", ["semMotorista"]));
            $f("c-andamento").addEventListener("click", alternar("andamento"));

            if (S.staff) {
                $f("c-sem").addEventListener("click", alternar("semMotorista", ["atrasadas"]));
            }

            $f("c-limpar").addEventListener("click", function () {
                f.busca = f.status = f.cliente = f.motorista = f.de = f.ate = "";
                f.atrasadas = f.semMotorista = false;
                f.andamento = motorista;

                el.querySelectorAll("#filtros input, #filtros select").forEach(function (i) { i.value = ""; });
                mudou();
            });

            lista.addEventListener("click", function (e) {
                var tr = e.target.closest("tr[data-href]");

                if (e.target.closest("#p-ant")) {
                    f.pagina--;
                    carregar();
                } else if (e.target.closest("#p-prox")) {
                    f.pagina++;
                    carregar();
                } else if (e.target.closest("[data-tentar]")) {
                    carregar();
                } else if (tr) {
                    window.location.hash = tr.getAttribute("data-href");
                }
            });

            return carregar();
        }
    };

})(window.Korven);
