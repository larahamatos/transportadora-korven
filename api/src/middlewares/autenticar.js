// autenticação por chave de API
//
// A loja envia "Authorization: Bearer <chave>" (ou o cabeçalho "X-API-Key").
// O repositório de clientes confere a chave (hash SHA-256); a chave em si nunca fica guardada.
// Tentativas inválidas são limitadas por IP para dificultar adivinhação.

const crypto = require("node:crypto");
const { naoAutenticado, limite } = require("../errors");

function hashDaChave(chave) {
    return crypto.createHash("sha256").update(chave).digest("hex");
}

function lerChave(req) {
    const auth = req.get("authorization") || "";
    const m = /^Bearer\s+(\S+)$/i.exec(auth);

    return m ? m[1] : (req.get("x-api-key") || "").trim();
}

function autenticar(clientes, config) {
    const falhas = new Map();

    return async function (req, res, next) {
        const agora = Date.now();
        const ip = req.ip;
        const f = falhas.get(ip);

        if (f && agora - f.inicio > 60000) {
            falhas.delete(ip);
        }

        const atual = falhas.get(ip);

        if (atual && atual.n >= config.falhasPorMinuto) {
            return next(limite(Math.ceil((60000 - (agora - atual.inicio)) / 1000)));
        }

        const chave = lerChave(req);
        const cliente = chave ? await clientes.autenticar(chave) : null;

        if (!cliente) {
            const r = atual || { n: 0, inicio: agora };

            r.n++;
            falhas.set(ip, r);

            return next(naoAutenticado());
        }

        req.cliente = cliente;
        next();
    };
}

module.exports = { autenticar, hashDaChave };
