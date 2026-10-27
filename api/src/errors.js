// erro de negócio com status HTTP e código estável para o cliente da API

class ErroApi extends Error {
    constructor(status, codigo, mensagem, detalhes) {
        super(mensagem);

        this.status = status;
        this.codigo = codigo;
        this.detalhes = detalhes;
    }
}

// o repositório lança isto quando um valor único já existe (campo = nome do campo em conflito)
class ConflitoUnico extends Error {
    constructor(campo) {
        super("Valor duplicado em " + campo);

        this.campo = campo;
    }
}

module.exports = {
    ErroApi,
    ConflitoUnico,

    validacao: (detalhes) => new ErroApi(422, "VALIDACAO", "Há campos inválidos na requisição.", detalhes),
    naoAutenticado: (msg) => new ErroApi(401, "NAO_AUTENTICADO", msg || "Chave de API ausente ou inválida."),
    naoEncontrado: (msg) => new ErroApi(404, "NAO_ENCONTRADO", msg || "Recurso não encontrado."),
    limite: (segundos) => {
        const e = new ErroApi(429, "LIMITE_EXCEDIDO", "Muitas requisições. Tente novamente em instantes.");

        e.retryAfter = segundos;

        return e;
    }
};
