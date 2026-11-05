// TELA DE EXEMPLO SIMPLES  (abre em http://127.0.0.1:5500/sistema/app.html#/exemplo)
// Pra ver a tela, abra o app.html com o Live Server.
// Copie este arquivo para criar uma tela nova.

// 1) ESSAS 2 LINHAS SÃO NECESSÁRIAS EM TODAS AS TELAS
// "Korven" é o objeto principal do sistema. As telas ficam guardadas em Korven.views.
// Sem essas 2 linhas a tela não é registrada e aparece "Em construção". Só copia.
window.Korven = window.Korven || {};
Korven.views = Korven.views || {};


// 2) O NOME DA TELA ("exemplo") TEM QUE SER IGUAL AO ID DA ROTA
// Em assets/js/routes.js existe uma rota com id: "exemplo"
// Aqui usamos o mesmo nome: Korven.views["exemplo"]
// Se estiver diferente, a tela não aparece.
//
// "container" é a área vazia da página onde a tela é desenhada.
// Aqui tu tá tipo dentro de um <body></body>. Cria um <section> e daí começar a criar os elementos dentro dele

// O html é sempre escrito em função nesse formato:
// Korven.views["exemplo"] = function (container) { aqui vai o HTML da tela }

// Lembrando que "exemplo" acima é o ID de uma tela lá no routes.js

Korven.views["exemplo"] = function (container) {

    // 3) O HTML DA TELA
    // Escreve o HTML dentro das aspas, como num arquivo .html.
    container.innerHTML =

        '<style>' +
            '.ex-titulo { margin: 0 0 4px; font-family: var(--d); font-size: 22px; }' +
            '.ex-sub { margin: 0 0 24px; color: var(--grey); }' +

            // Cartões de números lado a lado
            '.ex-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; margin-bottom: 28px; }' +
            '.ex-card { padding: 20px; border: 1px solid var(--line-soft); border-radius: 20px; background: var(--surface-2); }' +
            '.ex-card small { display: block; color: var(--grey); font-weight: 700; }' +
            '.ex-card strong { display: block; margin-top: 6px; font-family: var(--d); font-size: 34px; color: var(--accent); }' +
            '.ex-card.alerta strong { color: var(--danger); }' +

            // Lista de entregas
            '.ex-lista { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }' +
            '.ex-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 16px 20px; border: 1px solid var(--line-soft); border-radius: 18px; background: var(--surface-2); }' +
            '.ex-item strong { display: block; }' +
            '.ex-item small { color: var(--grey); }' +
            '.ex-badge { padding: 4px 12px; border: 1.5px solid var(--accent); border-radius: 99px; color: var(--accent); font-size: 12px; font-weight: 700; white-space: nowrap; }' +
            '.ex-badge.atraso { border-color: var(--danger); color: var(--danger); }' +
        '</style>' +

        '<section>' +
            '<h2 class="ex-titulo">Resumo das entregas</h2>' +
            '<p class="ex-sub">Dados de exemplo, escritos direto no HTML.</p>' +

            '<div class="ex-cards">' +
                '<div class="ex-card"><small>Em rota</small><strong>12</strong></div>' +
                '<div class="ex-card"><small>Entregues hoje</small><strong>8</strong></div>' +
                '<div class="ex-card alerta"><small>Atrasadas</small><strong>2</strong></div>' +
            '</div>' +

            // Cada <li> é uma entrega.
            '<ul class="ex-lista">' +
                '<li class="ex-item">' +
                    '<div><strong>KV-476321</strong><small>Marina Souza Almeida · São Paulo/SP</small></div>' +
                    '<span class="ex-badge">Em rodovia</span>' +
                '</li>' +
                '<li class="ex-item">' +
                    '<div><strong>KV-482910</strong><small>Carlos Eduardo Lima · Curitiba/PR</small></div>' +
                    '<span class="ex-badge">Saiu para entrega</span>' +
                '</li>' +
                '<li class="ex-item">' +
                    '<div><strong>KV-471205</strong><small>Patrícia Gomes · Florianópolis/SC</small></div>' +
                    '<span class="ex-badge atraso">Atrasada</span>' +
                '</li>' +
            '</ul>' +
        '</section>';
};


// =====================================================================
// COMO CRIAR UMA TELA NOVA A PARTIR DESSA
// =====================================================================
// Copia esse arquivo para assets/js/views/<nome-da-tela>.js
// Troque "exemplo" em Korven.views["exemplo"] pelo id da sua rota
// A rota precisa existir em assets/js/routes.js com o MESMO id
// Coloque <script src="assets/js/views/<nome-da-tela>.js"></script> em app.html,
// Coloque esse <script> também no motorista.html e no cliente.html, sempre logo abaixo do script do placeholder.js
// (e antes do script principal da página: app.js, motorista.js ou cliente.js)
// Abre o live server e ve http://127.0.0.1:5500/sistema/app.html#/id-da-rota