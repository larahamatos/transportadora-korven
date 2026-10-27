// Ponto único de acesso a dados do sistema (Korven.api.*).
// Hoje responde com o mock; quando o banco existir, troque o corpo destas funções pelo Supabase
// mantendo as mesmas assinaturas e o front não precisa mudar.
//
// Convenção: toda função devolve uma Promise e erros vêm como Error com a mensagem pronta para exibir.

window.Korven = window.Korven || {};

(function () {
    var ATRASO_MOCK = 650;

    function esperar(ms) {
        return new Promise(function (ok) {
            setTimeout(ok, ms);
        });
    }

    Korven.api = {
        // Valida e-mail e senha e devolve o usuário (sem a senha).
        // Supabase: supabase.auth.signInWithPassword + leitura de usuario.perfil_acesso.
        entrar: function (email, senha) {
            return esperar(ATRASO_MOCK).then(function () {
                var achado = Korven.mock.usuarios.filter(function (u) {
                    return u.email === String(email).trim().toLowerCase() && u.senha === senha;
                })[0];

                if (!achado) {
                    throw new Error("E-mail ou senha incorretos.");
                }

                return {
                    id: achado.id,
                    nome: achado.nome,
                    email: achado.email,
                    perfil_acesso: achado.perfil_acesso
                };
            });
        },

        // Encerra a sessão no servidor. Supabase: supabase.auth.signOut().
        sair: function () {
            return esperar(0);
        },

        // Envia o e-mail de recuperação. Supabase: supabase.auth.resetPasswordForEmail.
        // Responde igual exista ou não o e-mail, para não revelar quem tem conta.
        recuperarSenha: function () {
            return esperar(ATRASO_MOCK);
        }
    };
})();
