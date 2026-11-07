// configuração lida do ambiente (veja .env.example)

function numero(nome, padrao) {
    const v = Number(process.env[nome]);

    return Number.isFinite(v) && v > 0 ? v : padrao;
}

// quantos proxies confiáveis existem na frente da API (0 = nenhum). Atrás de um proxy (Render, Vercel, Nginx),
// use 1: sem isso todos os clientes aparecem com o IP do proxy e o limite por IP pune todo mundo junto.
function proxies() {
    const v = Number.parseInt(process.env.TRUST_PROXY, 10);

    return Number.isInteger(v) && v >= 0 && v <= 5 ? v : 0;
}

module.exports = {
    porta: numero("PORT", 3000),
    confiarProxy: proxies(),
    // banco (Supabase): quando os dois estão definidos, a API usa o banco; senão, repositórios em memória
    supabaseUrl: (process.env.SUPABASE_URL || "").trim(),
    supabaseAnonKey: (process.env.SUPABASE_ANON_KEY || "").trim(),

    // lojas autorizadas no modo em memória (sem banco): "Nome:hashSha256,Outro Nome:hashSha256"
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
