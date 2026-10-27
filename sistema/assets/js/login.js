// Tela de login: entrar, mostrar/ocultar senha, recuperar senha e atalhos do mock.

(function () {
    // Já tem sessão: vai direto para o sistema.
    var logado = Korven.auth.usuario();

    if (logado) {
        location.replace(Korven.auth.destino(logado.perfil_acesso));
        return;
    }

    var $ = function (id) {
        return document.getElementById(id);
    };

    var card = $("card");
    var form = $("form");
    var email = $("email");
    var senha = $("senha");
    var msg = $("msg");
    var enviar = $("enviar");
    var modo = "entrar"; // "entrar" | "recuperar"

    $("ver").innerHTML = Korven.icon("olho");
    document.querySelector(".site").innerHTML = Korven.icon("voltar") + "Voltar ao site";

    function mostrar(texto, tipo) {
        msg.textContent = texto || "";
        msg.className = "msg" + (tipo ? " " + tipo : "");
    }

    function ocupado(sim) {
        enviar.disabled = sim;
        enviar.classList.toggle("is-loading", sim);
    }

    function erro(texto, campo) {
        mostrar(texto, "erro");
        card.classList.remove("tremer");
        void card.offsetWidth; // reinicia a animação
        card.classList.add("tremer");

        [email, senha].forEach(function (c) {
            c.closest(".field").classList.toggle("invalid", c === campo);
        });

        campo.focus();
    }

    function trocarModo(novo) {
        modo = novo;

        var rec = novo === "recuperar";

        $("titulo").textContent = rec ? "Recuperar senha" : "Entrar no sistema";
        $("sub").textContent = rec
            ? "Informe seu e-mail e enviaremos um link para criar uma nova senha."
            : "Use o e-mail e a senha da sua conta Korven.";
        $("enviar-txt").textContent = rec ? "Enviar link" : "Entrar";
        $("campo-senha").hidden = rec;
        $("linha-opcoes").hidden = rec;
        $("voltar").hidden = !rec;
        $("demo").hidden = rec;

        mostrar("");
        form.querySelectorAll(".invalid").forEach(function (f) {
            f.classList.remove("invalid");
        });
        email.focus();
    }

    // Mostrar / ocultar senha
    $("ver").addEventListener("click", function () {
        var mostrando = senha.type === "text";

        senha.type = mostrando ? "password" : "text";
        this.innerHTML = Korven.icon(mostrando ? "olho" : "olhoOff");
        this.setAttribute("aria-pressed", String(!mostrando));
        this.setAttribute("aria-label", mostrando ? "Mostrar senha" : "Ocultar senha");
    });

    $("esqueci").addEventListener("click", function () {
        trocarModo("recuperar");
    });

    $("voltar").addEventListener("click", function () {
        trocarModo("entrar");
    });

    // Atalhos de demonstração: só preenchem; quem entra é o botão.
    document.querySelectorAll(".chips button").forEach(function (b) {
        b.addEventListener("click", function () {
            email.value = b.dataset.email;
            senha.value = b.dataset.senha;
            mostrar("");
            enviar.focus();
        });
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();

        var valorEmail = email.value.trim();

        if (!/^\S+@\S+\.\S+$/.test(valorEmail)) {
            return erro("Informe um e-mail válido.", email);
        }

        if (modo === "recuperar") {
            ocupado(true);
            mostrar("");

            Korven.api.recuperarSenha(valorEmail).then(function () {
                mostrar("Se o e-mail estiver cadastrado, o link chegará em instantes.", "ok");
            }).catch(function () {
                mostrar("Não foi possível enviar agora. Tente de novo.", "erro");
            }).then(function () {
                ocupado(false);
            });

            return;
        }

        if (!senha.value) {
            return erro("Informe sua senha.", senha);
        }

        ocupado(true);
        mostrar("");

        Korven.auth.entrar(valorEmail, senha.value, $("manter").checked).then(function (u) {
            mostrar("Bem-vindo, " + u.nome + "!", "ok");
            location.replace(Korven.auth.destino(u.perfil_acesso));
        }).catch(function (err) {
            ocupado(false);
            senha.value = "";
            erro(err.message, senha);
        });
    });

    email.focus();
})();
