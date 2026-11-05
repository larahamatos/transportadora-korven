// Lista de entregas (#/entregas). Modelo das demais telas: entregas.html + entregas.css + este arquivo.
// Dados por Korven.api.* ; texto vindo de dados entra por textContent.
(function () {
    var STATUS = {
        solicitada: "Solicitada",
        coletada: "Coletada",
        saiu_cd: "Saiu do CD",
        em_rodovia: "Em rodovia",
        na_cidade: "Na cidade",
        saiu_entrega: "Saiu para entrega",
        entregue: "Entregue"
    };

    function el(tag, classe, texto) {
        var n = document.createElement(tag);

        if (classe) {
            n.className = classe;
        }

        if (texto !== undefined) {
            n.textContent = texto;
        }

        return n;
    }

    function hoje() {
        return new Date().toISOString().slice(0, 10);
    }

    function formatarData(iso) {
        var p = iso.split("-");

        return p[2] + "/" + p[1] + "/" + p[0];
    }

    function atrasada(x) {
        return x.status !== "entregue" && x.data_prevista < hoje();
    }

    function linha(x, mostrarCliente, mostrarMotorista) {
        var li = el("li", "ent-row");
        var cod = el("div", "ent-cod");
        var quem = el("div", "ent-quem");
        var st = el("div", "ent-st");
        var prazo = el("div", "ent-prazo");

        cod.appendChild(el("strong", "", x.codigo_rastreamento));
        cod.appendChild(el("small", "", "Pedido " + x.codigo_pedido_externo));

        quem.appendChild(el("strong", "", x.nome_destinatario));
        quem.appendChild(el("small", "", x.endereco_destino));

        var extra = [];

        if (mostrarCliente && x.cliente_nome) {
            extra.push(x.cliente_nome);
        }

        if (mostrarMotorista) {
            extra.push(x.motorista_nome || "Sem motorista");
        }

        if (extra.length) {
            quem.appendChild(el("small", "ent-extra", extra.join(" · ")));
        }

        st.appendChild(el("span", "ent-badge st-" + x.status, STATUS[x.status] || x.status));

        if (atrasada(x)) {
            st.appendChild(el("span", "ent-badge st-atraso", "Atrasada"));
        }

        if (mostrarMotorista && !x.motorista_nome && x.status !== "entregue") {
            st.appendChild(el("span", "ent-badge st-sem", "Sem motorista"));
        }

        prazo.appendChild(el("small", "", "Previsão"));
        prazo.appendChild(el("strong", "", formatarData(x.data_prevista)));

        [cod, quem, st, prazo].forEach(function (c) {
            li.appendChild(c);
        });

        return li;
    }

    Korven.view("entregas", function (container, ctx) {
        var perfil = ctx.perfil;
        var mostrarCliente = perfil === "admin" || perfil === "operador";
        var mostrarMotorista = mostrarCliente;
        var dados = [];
        var vivo = true; // evita desenhar se o usuário já saiu da tela

        var busca = container.querySelector("input");
        var filtro = container.querySelector("select");
        var conta = container.querySelector(".ent-conta");
        var lista = container.querySelector(".ent-list");

        [["", "Todos os status"]].concat(Object.keys(STATUS).map(function (k) {
            return [k, STATUS[k]];
        })).forEach(function (o) {
            var op = el("option", "", o[1]);

            op.value = o[0];
            filtro.appendChild(op);
        });

        function desenhar() {
            var termo = busca.value.trim().toLowerCase();

            var itens = dados.filter(function (x) {
                var achou = !termo ||
                    x.codigo_rastreamento.toLowerCase().indexOf(termo) !== -1 ||
                    x.codigo_pedido_externo.toLowerCase().indexOf(termo) !== -1;

                return achou && (!filtro.value || x.status === filtro.value);
            });

            // Motorista vê só as em andamento, pela data prevista (doc de telas).
            if (perfil === "motorista") {
                itens = itens.filter(function (x) {
                    return x.status !== "entregue";
                });
            }

            itens.sort(function (a, b) {
                return a.data_prevista < b.data_prevista ? -1 : 1;
            });

            lista.innerHTML = "";
            itens.forEach(function (x) {
                lista.appendChild(linha(x, mostrarCliente, mostrarMotorista));
            });

            conta.textContent = itens.length
                ? itens.length + (itens.length === 1 ? " entrega" : " entregas")
                : "Nenhuma entrega encontrada.";
        }

        busca.addEventListener("input", desenhar);
        filtro.addEventListener("change", desenhar);

        conta.textContent = "Carregando entregas…";

        Korven.api.listarEntregas(ctx.usuario).then(function (r) {
            if (vivo) {
                dados = r;
                desenhar();
            }
        }).catch(function (err) {
            if (vivo) {
                conta.textContent = err.message || "Não foi possível carregar as entregas.";
            }
        });

        return function () {
            vivo = false;
        };
    });
})();
