// repositório de clientes (lojas) — IMPLEMENTAÇÃO TEMPORÁRIA, SEM BANCO
//
// Lê os clientes da configuração (variável CLIENTES). Quando o banco existir, troque este arquivo
// por uma consulta à tabela de clientes mantendo o mesmo método:
//   buscarAtivoPorHash(hash) -> { id, nome } | null   (hash = SHA-256 hex da chave de API)

module.exports = function clientes(lista) {
    return {
        buscarAtivoPorHash(hash) {
            const c = lista.filter((x) => x.hash === hash)[0];

            return c ? { id: c.id, nome: c.nome } : null;
        }
    };
};
