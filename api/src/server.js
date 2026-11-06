// inicia o servidor HTTP
//
// Com SUPABASE_URL e SUPABASE_ANON_KEY no .env, usa o banco (as lojas vêm da tabela integracao_api).
// Sem eles, usa repositórios em memória: as entregas criadas somem ao reiniciar e as lojas vêm de CLIENTES.

const config = require("./config");
const { criarApp } = require("./app");

let repos;
let modo;

if (config.supabaseUrl && config.supabaseAnonKey) {
    repos = require("./repositories/supabase")(config.supabaseUrl, config.supabaseAnonKey);
    modo = "banco Supabase";
} else {
    repos = { clientes: require("./repositories/clientes")(config.clientes), entregas: require("./repositories/entregas")() };
    modo = "sem banco: dados em memória, " + config.clientes.length + " cliente(s)";

    if (!config.clientes.length) {
        console.warn("Nenhum cliente configurado: defina SUPABASE_URL e SUPABASE_ANON_KEY, ou CLIENTES (npm run gerar-chave -- \"NomeDaLoja\").");
    }
}

const app = criarApp(repos, config);

app.listen(config.porta, () => {
    console.log("API de integração Korven em http://localhost:" + config.porta + " (" + modo + ")");
});
