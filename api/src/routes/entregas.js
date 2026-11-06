// rotas de /api/v1/entregas (todas exigem chave de API)

const express = require("express");
const { ErroApi } = require("../errors");

module.exports = function rotas(servico) {
    const r = express.Router();

    // cria a entrega (201) ou devolve a já existente para o mesmo pedido (200)
    r.post("/", async (req, res) => {
        if (!req.is("application/json")) {
            throw new ErroApi(415, "TIPO_NAO_SUPORTADO", "Envie o corpo como application/json.");
        }

        const { dados, criada } = await servico.criar(req.cliente, req.body);

        if (criada) {
            res.set("Location", "/api/v1/entregas/" + dados.entrega.codigo_rastreamento);
        }

        res.status(criada ? 201 : 200).json(dados);
    });

    r.get("/", async (req, res) => {
        res.json(await servico.listar(req.cliente, req.query));
    });

    r.get("/:codigo", async (req, res) => {
        res.json(await servico.consultar(req.cliente, req.params.codigo));
    });

    return r;
};
