// configuração lida do ambiente (veja .env.example)

function numero(nome, padrao) {
    const v = Number(process.env[nome]);

    return Number.isFinite(v) && v > 0 ? v : padrao;
}

module.exports = {
    porta: numero("PORT", 3000),
    // lojas autorizadas, enquanto não há banco: "Nome:hashSha256,Outro Nome:hashSha256"
    // (gere com: npm run gerar-chave -- "LojaVerde")
    clientes: (process.env.CLIENTES || "").split(",").map((x) => x.trim()).filter(Boolean).map((x, i) => {
        const k = x.lastIndexOf(":");

        return { id: i + 1, nome: x.slice(0, k).trim(), hash: x.slice(k + 1).trim().toLowerCase() };
    }).filter((c) => c.nome && /^[a-f0-9]{64}$/.test(c.hash)),

    // prazo usado quando a loja não informa data_prevista
    prazoPadraoDias: numero("PRAZO_PADRAO_DIAS", 5),

    // requisições por minuto de cada chave de API
    limitePorMinuto: numero("LIMITE_POR_MINUTO", 120),

    // tentativas de autenticação inválidas por minuto de cada IP
    falhasPorMinuto: numero("FALHAS_POR_MINUTO", 10)
};
