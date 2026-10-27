// limite de requisições por minuto de cada cliente (janela fixa, em memória)
//
// Em produção com mais de uma instância, troque o Map por um armazenamento compartilhado (ex.: Redis).

const { limite } = require("../errors");

module.exports = function limitePorCliente(config) {
    const janelas = new Map();

    return function (req, res, next) {
        const agora = Date.now();
        let j = janelas.get(req.cliente.id);

        if (!j || agora - j.inicio >= 60000) {
            j = { inicio: agora, n: 0 };
            janelas.set(req.cliente.id, j);
        }

        j.n++;

        res.set("X-RateLimit-Limit", String(config.limitePorMinuto));
        res.set("X-RateLimit-Remaining", String(Math.max(0, config.limitePorMinuto - j.n)));

        if (j.n > config.limitePorMinuto) {
            return next(limite(Math.ceil((60000 - (agora - j.inicio)) / 1000)));
        }

        next();
    };
};
