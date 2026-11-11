// gera os arquivos env.js (URL e chave pública do Supabase) a partir de variáveis de ambiente.
// Na Vercel: variáveis SUPABASE_URL e SUPABASE_ANON_KEY (Settings > Environment Variables).
// Local: usa as mesmas variáveis ou, se faltarem, o api/.env.
// Os env.js gerados não vão para o git.

const fs = require("fs");
const path = require("path");

const raiz = path.join(__dirname, "..");

function lerDotenv(arquivo) {
    const vars = {};

    if (!fs.existsSync(arquivo)) {
        return vars;
    }

    fs.readFileSync(arquivo, "utf8").split(/\r?\n/).forEach(function (linha) {
        const m = linha.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);

        if (m && !linha.trim().startsWith("#")) {
            vars[m[1]] = m[2].replace(/^["']|["']$/g, "");
        }
    });

    return vars;
}

const local = lerDotenv(path.join(raiz, "api", ".env"));
const url = (process.env.SUPABASE_URL || local.SUPABASE_URL || "").replace(/\/+$/, "");
const chave = process.env.SUPABASE_ANON_KEY || local.SUPABASE_ANON_KEY || "";

if (!/^https:\/\/.+/.test(url) || chave.length < 20) {
    console.error("Faltam SUPABASE_URL e/ou SUPABASE_ANON_KEY (variáveis de ambiente ou api/.env).");
    process.exit(1);
}

const conteudo = "window.KORVEN_ENV = " + JSON.stringify({ url: url, chave: chave }) + ";\n";

["env.js", path.join("sistema", "assets", "js", "core", "env.js")].forEach(function (destino) {
    fs.writeFileSync(path.join(raiz, destino), conteudo);
    console.log("gerado " + destino);
});
