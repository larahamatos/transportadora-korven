//peças de interface: janelas, estados vazios, carregamento, campos e botões ocupados

window.Korven = window.Korven || {};

(function (K) {
    "use strict";

    var esc = K.dom.esc;

    var ICONES = {
        caixa: "M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10",
        busca: "M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4.2-4.2",
        usuarios: "M9 11.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8zM3 20c0-3.4 2.7-6 6-6s6 2.6 6 6",
        chave: "M14 10a4 4 0 1 0-3.2 3.9L11 15h2v2h2v2h3v-3l-4.2-4.2",
        alerta: "M12 8v5M12 16.5h.01M4 19 12 4l8 15z"
    };

    var ui = K.ui = {};

    K.paginas = K.paginas || {};

    ui.icone = function (nome) {
        return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="' + (ICONES[nome] || nome) + '"/></svg>';
    };

    // ---------- estados ----------

    ui.vazio = function (titulo, texto, acao, icone) {
        return '<div class="vazio">' + ui.icone(icone || "caixa") + "<b>" + esc(titulo) + "</b><p>" + esc(texto || "") + "</p>" + (acao || "") + "</div>";
    };

    ui.carregando = function (linhas) {
        var s = "";

        for (var i = 0; i < (linhas || 5); i++) {
            s += '<div class="sk"></div>';
        }

        return '<div class="sk-rows" aria-busy="true" aria-label="Carregando">' + s + "</div>";
    };

    ui.falha = function (e, tentar) {
        return ui.vazio("Não foi possível carregar", K.erro(e), tentar ? '<button class="btn ghost sm" type="button" data-tentar>Tentar de novo</button>' : "", "alerta");
    };

    // ---------- botão ocupado ----------

    // desabilita o botão enquanto a promessa roda
    ui.ocupado = function (btn, promessa) {
        btn.classList.add("busy");

        return promessa.then(function (r) {
            btn.classList.remove("busy");
            return r;
        }, function (e) {
            btn.classList.remove("busy");
            throw e;
        });
    };

    // ---------- campos ----------

    // { id, rotulo, tipo, valor, req, ajuda, opcoes: [[valor, rótulo]], attrs }
    ui.campo = function (c) {
        var id = "f-" + c.id;
        var attrs = (c.req ? " required" : "") + (c.attrs ? " " + c.attrs : "") + (c.placeholder ? ' placeholder="' + esc(c.placeholder) + '"' : "");
        var v = c.valor == null ? "" : c.valor;
        var el;

        if (c.tipo === "select") {
            el = '<select id="' + id + '" name="' + c.id + '"' + attrs + ">" + (c.opcoes || []).map(function (o) {
                return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(v) ? " selected" : "") + ">" + esc(o[1]) + "</option>";
            }).join("") + "</select>";
        } else if (c.tipo === "textarea") {
            el = '<textarea id="' + id + '" name="' + c.id + '"' + attrs + ">" + esc(v) + "</textarea>";
        } else {
            el = '<input id="' + id + '" name="' + c.id + '" type="' + (c.tipo || "text") + '" value="' + esc(v) + '"' + attrs + ">";
        }

        return '<div class="field"' + (c.classe ? ' style="' + c.classe + '"' : "") + '><label for="' + id + '">' + esc(c.rotulo) + (c.req ? " <i>*</i>" : "") + "</label>" + el + (c.ajuda ? '<span class="hint">' + esc(c.ajuda) + "</span>" : "") + "</div>";
    };

    // valores de um formulário como objeto (textos aparados)
    ui.valores = function (form) {
        var o = {};

        Array.prototype.forEach.call(form.elements, function (el) {
            if (!el.name) {
                return;
            }

            o[el.name] = el.type === "checkbox" ? el.checked : typeof el.value === "string" ? el.value.trim() : el.value;
        });

        return o;
    };

    // máscaras de digitação (data-mask="cpf|tel")
    ui.mascaras = function (raiz) {
        Array.prototype.forEach.call(raiz.querySelectorAll("[data-mask]"), function (i) {
            var fn = i.getAttribute("data-mask") === "tel" ? K.fmt.telefone : K.fmt.cpfCnpj;

            i.addEventListener("input", function () {
                i.value = fn(i.value);
            });
        });
    };

    ui.marcarErro = function (el, msg) {
        var campo = el.closest(".field");

        if (!campo) {
            return;
        }

        campo.classList.add("erro");

        var m = campo.querySelector(".msg");

        if (!m) {
            m = document.createElement("span");
            m.className = "msg";
            campo.appendChild(m);
        }

        m.textContent = msg;

        el.addEventListener("input", function limpar() {
            campo.classList.remove("erro");
            m.remove();
            el.removeEventListener("input", limpar);
        });
    };

    // ---------- copiar ----------

    ui.copiar = function (texto, rotulo) {
        function ok() {
            K.aviso("Copiado", rotulo || "");
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(texto).then(ok, function () {
                K.aviso("Não foi possível copiar", "Selecione o texto e copie manualmente.", "erro");
            });
            return;
        }

        var t = document.createElement("textarea");

        t.value = texto;
        t.style.position = "fixed";
        t.style.opacity = "0";
        document.body.appendChild(t);
        t.select();

        try {
            document.execCommand("copy");
            ok();
        } catch (e) {
            K.aviso("Não foi possível copiar", "Selecione o texto e copie manualmente.", "erro");
        }

        t.remove();
    };

    // ---------- janela ----------

    // opts: { titulo, html, largo, ok: "Salvar", cancelar: "Cancelar" | false, perigo, aoAbrir(el), aoOk(el, valores) -> Promise }
    // aoOk que lança erro mostra a mensagem na janela e a mantém aberta.
    ui.modal = function (opts) {
        var anterior = document.activeElement;
        var bg = document.createElement("div");
        var f = document.createElement("form");
        var api = {};

        bg.className = "modal-bg";
        f.className = "modal" + (opts.largo ? " wide" : "");
        f.noValidate = true;
        f.setAttribute("role", "dialog");
        f.setAttribute("aria-modal", "true");
        f.setAttribute("aria-label", opts.titulo);

        f.innerHTML = '<div class="modal-h"><h2>' + esc(opts.titulo) + '</h2><button class="ib" type="button" data-fechar aria-label="Fechar"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"/></svg></button></div>' +
            '<div class="modal-b">' + (opts.html || "") + '<div class="form-err" role="alert" style="margin-top:14px"></div></div>' +
            '<div class="modal-f">' + (opts.cancelar === false ? "" : '<button class="btn ghost" type="button" data-fechar>' + (opts.cancelar || "Cancelar") + "</button>") +
            (opts.ok === false ? "" : '<button class="btn' + (opts.perigo ? " danger" : "") + '" type="submit">' + (opts.ok || "Salvar") + "</button>") + "</div>";

        bg.appendChild(f);
        document.body.appendChild(bg);
        document.body.style.overflow = "hidden";

        api.el = f;

        api.erro = function (msg) {
            f.querySelector(".form-err").textContent = msg || "";
        };

        api.fechar = function () {
            document.removeEventListener("keydown", tecla);
            document.body.style.overflow = "";
            bg.remove();

            if (anterior && anterior.focus) {
                anterior.focus();
            }
        };

        function tecla(e) {
            if (e.key === "Escape") {
                api.fechar();
            }
        }

        document.addEventListener("keydown", tecla);

        bg.addEventListener("mousedown", function (e) {
            if (e.target === bg) {
                api.fechar();
            }
        });

        f.addEventListener("click", function (e) {
            if (e.target.closest("[data-fechar]")) {
                api.fechar();
            }
        });

        f.addEventListener("submit", function (e) {
            e.preventDefault();

            if (!opts.aoOk) {
                api.fechar();
                return;
            }

            var btn = f.querySelector('[type="submit"]');

            api.erro("");

            ui.ocupado(btn, Promise.resolve().then(function () {
                return opts.aoOk(f, ui.valores(f), api);
            })).then(function (r) {
                if (r !== false) {
                    api.fechar();
                }
            }).catch(function (err) {
                api.erro(err.message || K.erro(err));
            });
        });

        ui.mascaras(f);

        if (opts.aoAbrir) {
            opts.aoAbrir(f, api);
        }

        var primeiro = f.querySelector(".modal-b input:not([type=hidden]):not([readonly]), .modal-b select, .modal-b textarea") || f.querySelector("[type=submit]");

        if (primeiro) {
            primeiro.focus({ preventScroll: true });
        }

        return api;
    };

    // pergunta sim/não; resolve true quando confirmado
    ui.confirmar = function (titulo, texto, rotulo, perigo) {
        return new Promise(function (resolve) {
            var resolvido = false;
            var m = ui.modal({
                titulo: titulo,
                html: "<p>" + esc(texto) + "</p>",
                ok: rotulo || "Confirmar",
                perigo: perigo,
                aoOk: function () {
                    resolvido = true;
                    resolve(true);
                }
            });

            var fechar = m.fechar;

            m.fechar = function () {
                fechar();

                if (!resolvido) {
                    resolve(false);
                }
            };

        });
    };

})(window.Korven);
