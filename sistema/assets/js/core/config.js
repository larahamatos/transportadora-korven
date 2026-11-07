//configuração do projeto e cliente do Supabase (a chave abaixo é a pública "anon": quem protege os dados é o RLS do banco)

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var URL = "REMOVIDO";
    var CHAVE = "REMOVIDO";

    K.config = {
        supabaseUrl: URL,
        site: "../index.html",
        rastreio: "../rastreio.html",
        api: "https://korven-api.onrender.com",
        docsApi: "https://korven-api.onrender.com/docs"
    };

    K.sb = window.supabase.createClient(URL, CHAVE, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });

    // mensagem amigável para qualquer erro vindo do Supabase ou da rede
    K.erro = function (e) {
        var m = e && (e.message || e.erro || e.error_description) || "";

        if (/failed to fetch|networkerror|load failed/i.test(m)) {
            return "Sem conexão com o servidor. Verifique a internet e tente de novo.";
        }

        if (/invalid login credentials/i.test(m)) {
            return "E-mail ou senha incorretos.";
        }

        if (/jwt|not authenticated|permission denied|row-level security/i.test(m)) {
            return "Você não tem permissão para isso (ou sua sessão expirou).";
        }

        if (/duplicate key|already exists|unique/i.test(m)) {
            return "Já existe um cadastro com esses dados (documento ou e-mail repetido).";
        }

        if (/violates foreign key/i.test(m)) {
            return "Este cadastro está em uso por outras informações e não pode ser removido.";
        }

        return m || "Algo deu errado. Tente novamente.";
    };

    // resolve { data } ou lança Error com mensagem amigável
    K.ok = function (resposta) {
        if (resposta && resposta.error) {
            throw new Error(K.erro(resposta.error));
        }

        return resposta.data;
    };

})(window.Korven);
