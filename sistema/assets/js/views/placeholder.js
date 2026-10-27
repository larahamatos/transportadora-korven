// Telas provisórias: aparecem enquanto a tela real de cada rota não foi construída,
// e também as telas de erro (sem acesso / não encontrada).
//
// Contrato de uma tela: Korven.views["<id>"] = function (container, ctx) { ... }
//   container  elemento <main> vazio onde a tela desenha o conteúdo
//   ctx        { usuario, perfil, rota }
// Pode devolver uma função de limpeza, chamada ao sair da tela.

window.Korven = window.Korven || {};
Korven.views = Korven.views || {};

(function () {
    function tela(container, html) {
        // "html" é sempre estático; dados dinâmicos entram depois por textContent.
        container.innerHTML = html;
    }

    // Tela ainda não construída: cabeçalho + esqueleto animado + indicação de onde entra o front.
    Korven.views._pendente = function (container, ctx) {
        var r = ctx.rota;

        tela(container,
            '<section class="ph">' +
                '<span class="eyebrow">' + Korven.icon("obra") + 'Em construção</span>' +
                '<h2 class="ph-title"></h2>' +
                '<p class="ph-desc"></p>' +
                '<div class="ph-grid" aria-hidden="true">' +
                    '<div class="sk sk-stat"></div><div class="sk sk-stat"></div><div class="sk sk-stat"></div>' +
                    '<div class="sk sk-wide"></div>' +
                '</div>' +
                '<div class="ph-note">' +
                    '<svg viewBox="0 0 200 12" aria-hidden="true"><path class="route" d="M0 6 H200"/></svg>' +
                    '<p>Esta tela entra aqui. Crie <code></code> e registre <code>Korven.views["' + r.id + '"]</code>.</p>' +
                '</div>' +
            '</section>');

        container.querySelector(".ph-title").textContent = r.titulo;
        container.querySelector(".ph-desc").textContent = r.descricao;
        container.querySelector(".ph-note code").textContent = "assets/js/views/" + r.id.replace("/", "-") + ".js";
    };

    function erro(icone, titulo, texto) {
        return function (container) {
            tela(container,
                '<section class="ph ph-erro">' +
                    '<span class="ph-erro-ico">' + Korven.icon(icone) + '</span>' +
                    '<h2 class="ph-title"></h2>' +
                    '<p class="ph-desc"></p>' +
                    '<a class="btn" href="#/">Voltar ao início</a>' +
                '</section>');

            container.querySelector(".ph-title").textContent = titulo;
            container.querySelector(".ph-desc").textContent = texto;
        };
    }

    Korven.views._negado = erro("cadeado", "Sem acesso", "Seu perfil não tem permissão para abrir esta tela.");
    Korven.views._naoEncontrado = erro("alerta", "Tela não encontrada", "O endereço não existe ou foi movido.");
})();
