// Ícones do sistema (traço, 24x24). Uso: Korven.icon("entregas") devolve o <svg> pronto.
// Para adicionar um ícone novo, inclua o conteúdo do SVG em "paths".

window.Korven = window.Korven || {};

(function () {
    var paths = {
        painel:     '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
        entregas:   '<path d="M21 8l-9-5-9 5v8l9 5 9-5V8z"/><path d="M3.3 7.5L12 12.5l8.7-5M12 22V12.5"/>',
        clientes:   '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
        motoristas: '<path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>',
        integracoes:'<path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/>',
        usuarios:   '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/>',
        relatorios: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
        perfil:     '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
        sair:       '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
        menu:       '<path d="M3 12h18M3 6h18M3 18h18"/>',
        recolher:   '<path d="M15 18l-6-6 6-6"/>',
        fechar:     '<path d="M18 6L6 18M6 6l12 12"/>',
        mais:       '<path d="M12 5v14M5 12h14"/>',
        olho:       '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
        olhoOff:    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M14.12 14.12a3 3 0 1 1-4.24-4.24M1 1l22 22"/>',
        alerta:     '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
        cadeado:    '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
        obra:       '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
        status:     '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>',
        voltar:     '<path d="M19 12H5M12 19l-7-7 7-7"/>'
    };

    // Os ícones são strings fixas deste arquivo (nunca vêm de dados do usuário).
    Korven.icon = function (nome, classe) {
        return '<svg class="icon' + (classe ? " " + classe : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
            (paths[nome] || paths.alerta) + "</svg>";
    };
})();
