// respostas de erro padronizadas: { "erro": { "codigo", "mensagem", "detalhes"? } }

const { ErroApi } = require("../errors");

function resposta(res, status, codigo, mensagem, detalhes) {
    const erro = { codigo, mensagem };

    if (detalhes) {
        erro.detalhes = detalhes;
    }

    res.status(status).json({ erro });
}

function naoEncontrada(req, res) {
    resposta(res, 404, "ROTA_INEXISTENTE", "Rota não encontrada.");
}

// eslint-disable-next-line no-unused-vars
function tratarErros(err, req, res, next) {
    if (err instanceof ErroApi) {
        if (err.retryAfter) {
            res.set("Retry-After", String(err.retryAfter));
        }

        return resposta(res, err.status, err.codigo, err.message, err.detalhes);
    }

    if (err.type === "entity.parse.failed") {
        return resposta(res, 400, "JSON_INVALIDO", "O corpo da requisição não é um JSON válido.");
    }

    if (err.type === "entity.too.large") {
        return resposta(res, 413, "CORPO_GRANDE", "O corpo da requisição excede o limite de 100 KB.");
    }

    console.error(err);
    resposta(res, 500, "ERRO_INTERNO", "Erro interno. Tente novamente.");
}

module.exports = { naoEncontrada, tratarErros };
