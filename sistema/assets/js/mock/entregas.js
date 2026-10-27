// DADOS DE DEMONSTRAÇÃO — somem quando o banco existir.
// Segue o modelo de dados (tabela entrega); os campos *_usuario_id e *_nome só existem para o mock
// filtrar por perfil e mostrar nomes sem precisar de joins.

window.Korven = window.Korven || {};

Korven.mock = Korven.mock || {};

(function () {
    var DIA = 86400000;

    // Datas relativas a hoje, para o exemplo nunca "envelhecer".
    function dia(n) {
        var d = new Date(Date.now() + n * DIA);

        return d.toISOString().slice(0, 10);
    }

    var CLIENTE = "00000000-0000-4000-8000-000000000004"; // Loja Verde (mock/usuarios.js)
    var MOTORISTA = "00000000-0000-4000-8000-000000000003"; // Motorista Demo

    function e(codigo, pedido, dest, cidade, status, prazo, cliente, motorista) {
        return {
            codigo_rastreamento: codigo,
            codigo_pedido_externo: pedido,
            nome_destinatario: dest,
            endereco_destino: cidade,
            status: status,
            data_prevista: dia(prazo),
            cliente_usuario_id: cliente ? CLIENTE : null,
            cliente_nome: cliente ? "Loja Verde" : "Mercado Aurora",
            motorista_usuario_id: motorista ? MOTORISTA : null,
            motorista_nome: motorista ? "Motorista Demo" : null
        };
    }

    Korven.mock.entregas = [
        e("KV-476321", "LV-90417", "Marina Souza Almeida", "São Paulo/SP", "em_rodovia", 2, true, true),
        e("KV-482910", "LV-90422", "Carlos Eduardo Lima", "Curitiba/PR", "saiu_entrega", 0, true, true),
        e("KV-471205", "LV-90388", "Patrícia Gomes", "Florianópolis/SC", "na_cidade", -1, true, true),
        e("KV-490031", "LV-90431", "Roberto Nunes", "Campinas/SP", "solicitada", 5, true, false),
        e("KV-468877", "LV-90351", "Fernanda Ribeiro", "Porto Alegre/RS", "entregue", -3, true, true),
        e("KV-493344", "MA-1204", "Tiago Martins", "Belo Horizonte/MG", "coletada", 4, false, false),
        e("KV-493720", "MA-1209", "Juliana Prado", "Rio de Janeiro/RJ", "saiu_cd", 3, false, true),
        e("KV-465102", "MA-1170", "André Cavalcanti", "Salvador/BA", "entregue", -6, false, false)
    ];
})();
