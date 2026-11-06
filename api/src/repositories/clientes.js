// repositório de clientes (lojas) em memória, para desenvolvimento e testes sem banco
//
// Lê os clientes da configuração (variável CLIENTES). Contrato (o mesmo de supabase.js):
//   autenticar(chave) -> { id, nome, token } | null    (chave = o que a loja envia no cabeçalho)

const crypto = require("node:crypto");

module.exports = function clientes(lista) {
    return {
        async autenticar(chave) {
            const hash = crypto.createHash("sha256").update(chave).digest("hex");
            const c = lista.filter((x) => x.hash === hash)[0];

            return c ? { id: c.id, nome: c.nome, token: chave } : null;
        }
    };
};
