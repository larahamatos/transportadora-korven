// inicia o servidor HTTP
//
// Enquanto não há banco, usa os repositórios em memória: as entregas criadas somem ao reiniciar.

const config = require("./config");
const { criarApp } = require("./app");
const clientesRepo = require("./repositories/clientes");
const entregasRepo = require("./repositories/entregas");

if (!config.clientes.length) {
    console.warn("Nenhum cliente configurado: defina CLIENTES no .env (use: npm run gerar-chave -- \"NomeDaLoja\").");
}

const app = criarApp({ clientes: clientesRepo(config.clientes), entregas: entregasRepo() }, config);

app.listen(config.porta, () => {
    console.log("API de integração Korven em http://localhost:" + config.porta + " (sem banco: dados em memória, " + config.clientes.length + " cliente(s))");
});
