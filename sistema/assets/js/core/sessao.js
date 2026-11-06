//sessão do usuário logado (Supabase Auth + tabela usuario)

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var S = K.sessao = {
        usuario: null,   // { id, nome, perfil_acesso }
        email: "",
        cliente: null,   // cadastro do cliente, quando perfil = cliente
        motorista: null, // cadastro do motorista, quando perfil = motorista

        get perfil() {
            return S.usuario ? S.usuario.perfil_acesso : null;
        },

        // um dos perfis informados?
        pode: function () {
            return S.perfil !== null && Array.prototype.indexOf.call(arguments, S.perfil) >= 0;
        },

        // staff = admin ou operador
        get staff() {
            return S.pode("admin", "operador");
        },

        home: function () {
            return S.perfil === "motorista" ? "#/entregas" : "#/painel";
        },

        // lê a sessão guardada no navegador; devolve true quando há alguém logado e liberado
        carregar: function () {
            return K.sb.auth.getSession().then(function (r) {
                var sessao = r.data && r.data.session;

                if (!sessao) {
                    return false;
                }

                return S.montar(sessao.user);
            });
        },

        montar: function (user) {
            return K.sb.from("usuario").select("id, nome, perfil_acesso").eq("id", user.id).maybeSingle().then(function (r) {
                if (r.error || !r.data || r.data.perfil_acesso === "sistema") {
                    return K.sb.auth.signOut().then(function () {
                        S.usuario = null;
                        throw new Error("Seu acesso ainda não foi liberado. Fale com o administrador.");
                    });
                }

                S.usuario = r.data;
                S.email = user.email || "";

                if (S.perfil === "cliente") {
                    return K.sb.from("cliente").select("id, nome, email, telefone").maybeSingle().then(function (c) {
                        S.cliente = c.data;
                        return true;
                    });
                }

                if (S.perfil === "motorista") {
                    return K.sb.from("motorista").select("id, nome, telefone, disponibilidade").maybeSingle().then(function (m) {
                        S.motorista = m.data;
                        return true;
                    });
                }

                return true;
            });
        },

        entrar: function (email, senha) {
            return K.sb.auth.signInWithPassword({ email: email, password: senha }).then(function (r) {
                if (r.error) {
                    throw new Error(K.erro(r.error));
                }

                return S.montar(r.data.user);
            });
        },

        sair: function () {
            return K.sb.auth.signOut().then(function () {
                S.usuario = null;
                S.cliente = null;
                S.motorista = null;
            });
        }
    };

})(window.Korven);
