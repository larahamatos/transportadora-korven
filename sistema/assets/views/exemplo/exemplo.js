// TELA DE EXEMPLO (abre em app.html#/exemplo, com o Live Server).
// Uma tela = pasta assets/views/<id>/ com 3 arquivos de mesmo nome:
//   exemplo.html  estrutura (já vem pronto dentro de "container")
//   exemplo.css   estilo (carregado sozinho)
//   exemplo.js    este arquivo: só o comportamento
//
// Korven.view("<id>", função) registra a tela. O <id> é o MESMO id da rota em routes.js
// (se a rota tem barra, como "entregas/nova", o id mantém a barra e a pasta usa hífen: entregas-nova/).
//   container  o <main> onde o exemplo.html já foi colocado (use container.querySelector)
//   ctx        { usuario, perfil, rota }
// Pode devolver uma função de limpeza (timers, listeners), chamada ao sair da tela.
//
// PARA CRIAR UMA TELA NOVA: copie esta pasta, renomeie a pasta e os 3 arquivos para o id da rota,
// troque o id aqui embaixo e ajuste o prefixo das classes (.ex-). Não precisa de <script> nos shells.
Korven.view("exemplo", function (container, ctx) {
    var hoje = new Date().toISOString().slice(0, 10);

    Korven.api.listarEntregas(ctx.usuario).then(function (lista) {
        var entregues = lista.filter(function (x) { return x.status === "entregue"; });
        var atrasadas = lista.filter(function (x) { return x.status !== "entregue" && x.data_prevista < hoje; });

        container.querySelector("#ex-total").textContent = lista.length;
        container.querySelector("#ex-entregues").textContent = entregues.length;
        container.querySelector("#ex-atrasadas").textContent = atrasadas.length;

        var ul = container.querySelector("#ex-lista");

        lista.forEach(function (x) {
            var li = document.createElement("li");

            li.className = "ex-item";
            li.innerHTML = "<div><strong></strong><small></small></div><span class='ex-badge'></span>";
            li.querySelector("strong").textContent = x.codigo_rastreamento;
            li.querySelector("small").textContent = x.nome_destinatario + " · " + x.endereco_destino;
            li.querySelector(".ex-badge").textContent = x.status;
            ul.appendChild(li);
        });
    });
});
