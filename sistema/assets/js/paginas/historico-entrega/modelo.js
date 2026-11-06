//histórico de entrega: converte o payload do banco no modelo usado pela tela
//
// Entrada: { entrega, itens, historico } (ver docs/modelo-de-dados.md)
// A tela só usa o que o banco guarda. Tudo que aparece além disso é calculado a partir desses campos.

window.Korven = window.Korven || {};
window.Korven.historico = window.Korven.historico || {};

(function (K) {
    "use strict";

    var fmt = K.fmt;

    // uma etapa por valor de entrega.status, na ordem do fluxo
    var ETAPAS = [
        { status: "solicitada", rotulo: "Solicitada", titulo: "Pedido recebido", icone: "M9 4h6v3H9zM7 5.5H6a1 1 0 0 0-1 1V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V6.5a1 1 0 0 0-1-1h-1M9 12h6M9 16h4" },
        { status: "coletada", rotulo: "Coletada", titulo: "Coleta confirmada", icone: "M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10" },
        { status: "saiu_cd", rotulo: "Saiu do CD", titulo: "Saiu do centro de distribuição", icone: "M3 21V9l9-5 9 5v12M8 21v-7h8v7M8 17.5h8" },
        { status: "em_rodovia", rotulo: "Em rodovia", titulo: "Em trânsito pela rodovia", icone: "M8 3 4 21M16 3l4 18M12 5v3M12 11v3M12 17v3" },
        { status: "na_cidade", rotulo: "Na cidade de destino", titulo: "Chegou à cidade de destino", icone: "M4 21V9h6v12M10 21V4h6v17M16 21v-9h4v9M3 21h18M12.5 8h1M12.5 12h1M12.5 16h1" },
        { status: "saiu_entrega", rotulo: "Saiu para entrega", titulo: "Saiu para entrega", icone: "M12 3l7 17-7-4-7 4z" },
        { status: "entregue", rotulo: "Entregue", titulo: "Entrega concluída", icone: "M20 6.5 9.5 17.5 4 12" }
    ];

    var PERFIL = {
        sistema: "Sistema",
        admin: "Administrador",
        cliente: "Cliente",
        operador: "Operador",
        motorista: "Motorista"
    };

    function indiceDe(status) {
        for (var i = 0; i < ETAPAS.length; i++) {
            if (ETAPAS[i].status === status) {
                return i;
            }
        }

        return -1;
    }

    function situacao(e, prevista, conclusao) {
        if (conclusao) {
            var dif = prevista - conclusao;

            return dif >= 0
                ? { tipo: "ok", texto: "Entregue no prazo" }
                : { tipo: "late", texto: "Entregue com " + fmt.duracao(dif) + " de atraso" };
        }

        var resta = prevista - Date.now();

        return resta >= 0
            ? { tipo: "ok", texto: "No prazo" }
            : { tipo: "late", texto: "Atrasada há " + fmt.duracao(resta) };
    }

    K.historico.ETAPAS = ETAPAS;

    K.historico.modelo = function (raw) {
        var e = raw.entrega;
        var registros = {};
        var atual = Math.max(0, indiceDe(e.status));

        (raw.historico || []).forEach(function (h) {
            var i = indiceDe(h.status_novo);

            if (i >= 0) {
                registros[i] = h;
            }
        });

        var etapas = ETAPAS.map(function (et, i) {
            var h = registros[i];
            var estado = i === atual ? "atual" : i < atual ? "feito" : "pendente";

            return {
                i: i,
                status: et.status,
                rotulo: et.rotulo,
                titulo: et.titulo,
                icone: et.icone,
                estado: estado,
                data: h ? new Date(h.data_alteracao) : null,
                observacao: h && h.observacao ? h.observacao : "",
                usuario: h && h.usuario ? { nome: h.usuario.nome, perfil: PERFIL[h.usuario.perfil] || h.usuario.perfil } : null
            };
        });

        var itens = raw.itens || [];
        var total = 0;
        var peso = 0;

        itens.forEach(function (x) {
            total += x.quantidade;
            peso += x.peso;
        });

        var prevista = new Date(e.data_prevista);
        var conclusao = e.data_conclusao ? new Date(e.data_conclusao) : null;

        return {
            entrega: e,
            etapas: etapas,
            atual: atual,
            itens: itens,
            totalItens: total,
            pesoTotal: peso,
            solicitacao: new Date(e.data_solicitacao),
            prevista: prevista,
            conclusao: conclusao,
            situacao: situacao(e, prevista, conclusao)
        };
    };

})(window.Korven);
