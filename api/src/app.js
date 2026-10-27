// monta a aplicação Express. Recebe o banco e a configuração, o que facilita os testes.

const fs = require("node:fs");
const path = require("node:path");
const express = require("express");
const swaggerUi = require("swagger-ui-express");
const YAML = require("yaml");
const entregasServico = require("./services/entregas");
const rotasEntregas = require("./routes/entregas");
const { autenticar } = require("./middlewares/autenticar");
const limitePorCliente = require("./middlewares/limite");
const { naoEncontrada, tratarErros } = require("./middlewares/erros");

// repos = { clientes, entregas } (ver src/repositories/)
function criarApp(repos, config) {
    const app = express();
    const clientes = repos.clientes;
    const servico = entregasServico(repos.entregas, config);

    app.disable("x-powered-by");
    app.set("trust proxy", false);

    app.use((req, res, next) => {
        res.set("X-Content-Type-Options", "nosniff");
        res.set("Cache-Control", "no-store");
        next();
    });

    // documentação interativa gerada do openapi.yaml
    const openapi = YAML.parse(fs.readFileSync(path.join(__dirname, "..", "openapi.yaml"), "utf8"));

    app.get("/docs/openapi.json", (req, res) => {
        res.json(openapi);
    });
    app.use("/docs", (req, res, next) => {
        res.set("Cache-Control", "no-cache");
        res.removeHeader("Content-Security-Policy");
        next();
    }, swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: "API de integração Korven" }));

    app.get("/saude", (req, res) => {
        res.json({ status: "ok" });
    });

    // autentica antes de ler o corpo: requisições sem chave nem chegam a ser processadas
    app.use(
        "/api/v1/entregas",
        autenticar(clientes, config),
        limitePorCliente(config),
        express.json({ limit: "100kb" }),
        rotasEntregas(servico)
    );

    app.use(naoEncontrada);
    app.use(tratarErros);

    return app;
}

module.exports = { criarApp };
