// Mapa de telas do sistema, tirado de docs/telas-do-sistema.md.
// É a ÚNICA fonte para menu, permissões de navegação e títulos: para criar uma tela, adicione uma linha aqui.
//
//   id        nome da rota (#/<id>) e da view em Korven.views[<id>]
//   titulo    título da página; "rotulo" troca o texto do menu por perfil
//   icone     nome em icons.js
//   perfis    quem pode abrir a rota
//   menu      em quais perfis ela aparece na barra lateral (vazio = só por link)
//   descricao resumo exibido enquanto a tela não foi construída

window.Korven = window.Korven || {};

(function () {
    var TODOS = ["admin", "operador", "motorista", "cliente"];

    Korven.perfis = {
        admin: "Administrador",
        operador: "Operador",
        motorista: "Motorista",
        cliente: "Cliente"
    };

    Korven.rotas = [
        {
            id: "painel",
            titulo: "Painel",
            icone: "painel",
            perfis: ["admin", "operador", "cliente"],
            menu: ["admin", "operador", "cliente"],
            descricao: "Visão geral das entregas: por status, atrasadas, sem motorista e concluídas hoje."
        },
        {
            id: "entregas",
            titulo: "Entregas",
            rotulo: { motorista: "Minhas entregas" },
            icone: "entregas",
            perfis: TODOS,
            menu: TODOS,
            descricao: "Lista de entregas com filtros, busca por código e acesso ao detalhe e histórico."
        },
        {
            id: "entregas/nova",
            titulo: "Nova entrega",
            icone: "mais",
            perfis: ["admin", "operador", "cliente"],
            menu: [],
            pai: "entregas",
            descricao: "Formulário de criação de entrega com destinatário, endereços e itens."
        },
        {
            id: "status",
            titulo: "Atualizar status",
            icone: "status",
            perfis: ["admin", "operador", "motorista"],
            menu: [],
            pai: "entregas",
            descricao: "Mostra só o próximo status permitido ao perfil, com observação opcional. Pensada para celular: botão grande e poucos campos."
        },
        {
            id: "clientes",
            titulo: "Clientes",
            icone: "clientes",
            perfis: ["admin", "operador"],
            menu: ["admin", "operador"],
            descricao: "Cadastro de clientes. Admin cria e edita; operador só consulta."
        },
        {
            id: "motoristas",
            titulo: "Motoristas",
            icone: "motoristas",
            perfis: ["admin", "operador"],
            menu: ["admin", "operador"],
            descricao: "Cadastro de motoristas e disponibilidade. Admin cria e edita; operador só consulta."
        },
        {
            id: "integracoes",
            titulo: "Integrações de API",
            rotulo: { admin: "Integrações", cliente: "Integração" },
            icone: "integracoes",
            perfis: ["admin", "cliente"],
            menu: ["admin", "cliente"],
            descricao: "Chaves de API das lojas: criar, ativar, desativar e gerar novo segredo."
        },
        {
            id: "usuarios",
            titulo: "Usuários",
            icone: "usuarios",
            perfis: ["admin"],
            menu: ["admin"],
            descricao: "Logins do sistema e seus perfis de acesso."
        },
        {
            id: "relatorios",
            titulo: "Relatórios",
            icone: "relatorios",
            perfis: ["admin"],
            menu: ["admin"],
            descricao: "Entregas por período, cliente e motorista, prazo, frete e exportação em CSV."
        },
        {
            id: "perfil",
            titulo: "Meu perfil",
            icone: "perfil",
            perfis: TODOS,
            menu: ["motorista"],
            descricao: "Edição do nome e troca de senha. Motorista também edita disponibilidade e telefone."
        }
    ];

    Korven.rota = function (id) {
        return Korven.rotas.filter(function (r) {
            return r.id === id;
        })[0] || null;
    };

    Korven.podeAcessar = function (rota, perfil) {
        return rota.perfis.indexOf(perfil) !== -1;
    };

    Korven.rotuloMenu = function (rota, perfil) {
        return (rota.rotulo && rota.rotulo[perfil]) || rota.titulo;
    };

    Korven.menuDo = function (perfil) {
        return Korven.rotas.filter(function (r) {
            return r.menu.indexOf(perfil) !== -1;
        });
    };
})();
