// DADOS DE DEMONSTRAÇÃO — somem quando o login for ligado ao Supabase Auth.
// As senhas aqui existem só para o mock; em produção elas ficam no Supabase Auth e nunca no front.

window.Korven = window.Korven || {};

Korven.mock = Korven.mock || {};

Korven.mock.usuarios = [
    {
        id: "00000000-0000-4000-8000-000000000001",
        nome: "Administrador Demo",
        email: "admin@korven.com",
        senha: "admin123",
        perfil_acesso: "admin"
    },
    {
        id: "00000000-0000-4000-8000-000000000002",
        nome: "Operador Demo",
        email: "operador@korven.com",
        senha: "operador123",
        perfil_acesso: "operador"
    },
    {
        id: "00000000-0000-4000-8000-000000000003",
        nome: "Motorista Demo",
        email: "motorista@korven.com",
        senha: "motorista123",
        perfil_acesso: "motorista"
    },
    {
        id: "00000000-0000-4000-8000-000000000004",
        nome: "Loja Verde",
        email: "cliente@korven.com",
        senha: "cliente123",
        perfil_acesso: "cliente"
    }
];
