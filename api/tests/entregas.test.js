// testes de ponta a ponta: sobem a API (repositórios em memória) e chamam os endpoints de verdade

const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");

const { criarApp } = require("../src/app");
const clientesRepo = require("../src/repositories/clientes");
const entregasRepo = require("../src/repositories/entregas");
const { hashDaChave } = require("../src/middlewares/autenticar");

const CONFIG = { porta: 0, prazoPadraoDias: 5, limitePorMinuto: 50, falhasPorMinuto: 5 };

function pedido(extra) {
    return Object.assign({
        codigo_pedido_externo: "LV-" + crypto.randomInt(1e6),
        nome_destinatario: "Marina Souza Almeida",
        endereco_origem: "Porto Alegre/RS",
        endereco_destino: "São Paulo/SP",
        itens: [{ descricao: "Monitor 27\"", quantidade: 3, peso: 21 }]
    }, extra);
}

async function subir(config) {
    const chaves = {};
    const lista = ["LojaVerde", "Mundo Tech"].map((nome, i) => {
        const chave = "kv_live_" + crypto.randomBytes(12).toString("hex");

        chaves[nome] = chave;

        return { id: i + 1, nome, hash: hashDaChave(chave) };
    });

    const repos = { clientes: clientesRepo(lista), entregas: entregasRepo() };
    const servidor = criarApp(repos, Object.assign({}, CONFIG, config)).listen(0);

    await new Promise((r) => servidor.once("listening", r));

    const base = "http://127.0.0.1:" + servidor.address().port;

    async function chamar(metodo, caminho, opcoes) {
        const o = opcoes || {};
        const headers = Object.assign({}, o.headers);

        if (o.chave) {
            headers.Authorization = "Bearer " + o.chave;
        }

        if (o.corpo !== undefined) {
            headers["Content-Type"] = o.tipo || "application/json";
        }

        const r = await fetch(base + caminho, {
            method: metodo,
            headers,
            body: o.corpo === undefined ? undefined : (typeof o.corpo === "string" ? o.corpo : JSON.stringify(o.corpo))
        });

        return { status: r.status, headers: r.headers, corpo: await r.json() };
    }

    return {
        base,
        chaves,
        chamar,
        encerrar: () => new Promise((r) => servidor.close(r))
    };
}

test("autenticação", async (t) => {
    const s = await subir();

    t.after(s.encerrar);

    await t.test("sem chave devolve 401", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas");

        assert.equal(r.status, 401);
        assert.equal(r.corpo.erro.codigo, "NAO_AUTENTICADO");
    });

    await t.test("chave inválida devolve 401", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas", { chave: "kv_live_errada" });

        assert.equal(r.status, 401);
    });

    await t.test("aceita o cabeçalho X-API-Key", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas", { headers: { "X-API-Key": s.chaves.LojaVerde } });

        assert.equal(r.status, 200);
    });

    await t.test("/docs é público e serve o contrato", async () => {
        const r = await s.chamar("GET", "/docs/openapi.json");

        assert.equal(r.status, 200);
        assert.ok(r.corpo.paths["/api/v1/entregas"]);

        const h = await fetch(s.base + "/docs/");

        assert.equal(h.status, 200);
        assert.match(await h.text(), /swagger/i);
    });

    await t.test("/saude é público", async () => {
        const r = await s.chamar("GET", "/saude");

        assert.equal(r.status, 200);
        assert.equal(r.corpo.status, "ok");
    });
});

test("criação de entrega", async (t) => {
    const s = await subir();

    t.after(s.encerrar);

    const chave = s.chaves.LojaVerde;

    await t.test("cria, gera código e abre o histórico", async () => {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: pedido({ codigo_pedido_externo: "LV-90417" }) });

        assert.equal(r.status, 201);
        assert.match(r.corpo.entrega.codigo_rastreamento, /^KV-\d{6}$/);
        assert.equal(r.headers.get("location"), "/api/v1/entregas/" + r.corpo.entrega.codigo_rastreamento);
        assert.equal(r.corpo.entrega.status, "solicitada");
        assert.equal(r.corpo.entrega.data_conclusao, null);
        assert.equal(r.corpo.itens.length, 1);
        assert.equal(r.corpo.historico.length, 1);
        assert.equal(r.corpo.historico[0].status_anterior, null);
        assert.equal(r.corpo.historico[0].status_novo, "solicitada");
        assert.deepEqual(r.corpo.historico[0].usuario, { nome: "Integração LojaVerde", perfil: "sistema" });
        assert.ok(!("cliente_id" in r.corpo.entrega) && !("id" in r.corpo.entrega));
    });

    await t.test("data_prevista padrão é daqui a 5 dias", async () => {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: pedido() });
        const dias = (Date.parse(r.corpo.entrega.data_prevista) - Date.parse(r.corpo.entrega.data_solicitacao)) / 864e5;

        assert.ok(Math.abs(dias - 5) < 0.01);
    });

    await t.test("respeita data_prevista informada", async () => {
        const prevista = new Date(Date.now() + 2 * 864e5).toISOString();
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: pedido({ data_prevista: prevista }) });

        assert.equal(r.status, 201);
        assert.equal(r.corpo.entrega.data_prevista, prevista);
    });

    await t.test("reenviar o mesmo pedido não duplica (200)", async () => {
        const corpo = pedido({ codigo_pedido_externo: "LV-IDEM-1" });
        const a = await s.chamar("POST", "/api/v1/entregas", { chave, corpo });
        const b = await s.chamar("POST", "/api/v1/entregas", { chave, corpo });

        assert.equal(a.status, 201);
        assert.equal(b.status, 200);
        assert.equal(b.corpo.entrega.codigo_rastreamento, a.corpo.entrega.codigo_rastreamento);

        const lista = await s.chamar("GET", "/api/v1/entregas?codigo_pedido_externo=LV-IDEM-1", { chave });

        assert.equal(lista.corpo.total, 1);
    });

    await t.test("pedidos simultâneos iguais geram uma só entrega", async () => {
        const corpo = pedido({ codigo_pedido_externo: "LV-PAR-1" });
        const rs = await Promise.all([1, 2, 3, 4].map(() => s.chamar("POST", "/api/v1/entregas", { chave, corpo })));
        const codigos = new Set(rs.map((r) => r.corpo.entrega.codigo_rastreamento));

        assert.equal(codigos.size, 1);
        assert.equal(rs.filter((r) => r.status === 201).length, 1);
    });

    await t.test("lojas diferentes podem usar o mesmo código de pedido", async () => {
        const corpo = pedido({ codigo_pedido_externo: "PED-1" });
        const a = await s.chamar("POST", "/api/v1/entregas", { chave: s.chaves.LojaVerde, corpo });
        const b = await s.chamar("POST", "/api/v1/entregas", { chave: s.chaves["Mundo Tech"], corpo });

        assert.equal(a.status, 201);
        assert.equal(b.status, 201);
        assert.notEqual(a.corpo.entrega.codigo_rastreamento, b.corpo.entrega.codigo_rastreamento);
    });
});

test("validação", async (t) => {
    const s = await subir();

    t.after(s.encerrar);

    const chave = s.chaves.LojaVerde;

    async function campos(corpo) {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo });

        assert.equal(r.status, 422);
        assert.equal(r.corpo.erro.codigo, "VALIDACAO");

        return r.corpo.erro.detalhes.map((d) => d.campo);
    }

    await t.test("campos obrigatórios", async () => {
        const c = await campos({});

        assert.deepEqual(c.sort(), ["codigo_pedido_externo", "endereco_destino", "endereco_origem", "itens", "nome_destinatario"]);
    });

    await t.test("itens inválidos apontam o índice", async () => {
        const c = await campos(pedido({ itens: [{ descricao: "", quantidade: 0, peso: -1 }, { descricao: "ok", quantidade: 1.5, peso: "10" }] }));

        assert.ok(c.includes("itens[0].descricao"));
        assert.ok(c.includes("itens[0].quantidade"));
        assert.ok(c.includes("itens[0].peso"));
        assert.ok(c.includes("itens[1].quantidade"));
        assert.ok(c.includes("itens[1].peso"));
    });

    await t.test("data_prevista no passado ou mal formatada", async () => {
        assert.deepEqual(await campos(pedido({ data_prevista: "2020-01-01T00:00:00Z" })), ["data_prevista"]);
        assert.deepEqual(await campos(pedido({ data_prevista: "amanhã" })), ["data_prevista"]);
    });

    await t.test("texto acima do limite", async () => {
        assert.deepEqual(await campos(pedido({ nome_destinatario: "x".repeat(121) })), ["nome_destinatario"]);
    });

    await t.test("JSON inválido devolve 400", async () => {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: "{quebrado", tipo: "application/json" });

        assert.equal(r.status, 400);
        assert.equal(r.corpo.erro.codigo, "JSON_INVALIDO");
    });

    await t.test("content-type diferente de JSON devolve 415", async () => {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: "a=1", tipo: "text/plain" });

        assert.equal(r.status, 415);
    });

    await t.test("corpo acima de 100 KB devolve 413", async () => {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave, corpo: pedido({ nome_destinatario: "x".repeat(120000) }) });

        assert.equal(r.status, 413);
    });
});

test("consulta e listagem", async (t) => {
    const s = await subir();

    t.after(s.encerrar);

    const verde = s.chaves.LojaVerde;
    const tech = s.chaves["Mundo Tech"];
    const criadas = [];

    for (let i = 0; i < 3; i++) {
        const r = await s.chamar("POST", "/api/v1/entregas", { chave: verde, corpo: pedido({ codigo_pedido_externo: "LV-" + i }) });

        criadas.push(r.corpo.entrega.codigo_rastreamento);
    }

    await t.test("consulta pelo código (aceita minúsculas)", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas/" + criadas[0].toLowerCase(), { chave: verde });

        assert.equal(r.status, 200);
        assert.equal(r.corpo.entrega.codigo_rastreamento, criadas[0]);
        assert.ok(Array.isArray(r.corpo.itens) && Array.isArray(r.corpo.historico));
    });

    await t.test("outra loja não enxerga a entrega (404)", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas/" + criadas[0], { chave: tech });

        assert.equal(r.status, 404);
        assert.equal(r.corpo.erro.codigo, "NAO_ENCONTRADO");
    });

    await t.test("lista só as entregas da própria loja, mais recentes primeiro", async () => {
        const a = await s.chamar("GET", "/api/v1/entregas", { chave: verde });
        const b = await s.chamar("GET", "/api/v1/entregas", { chave: tech });

        assert.equal(a.corpo.total, 3);
        assert.equal(a.corpo.dados[0].codigo_rastreamento, criadas[2]);
        assert.equal(b.corpo.total, 0);
    });

    await t.test("paginação", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas?limite=2&pagina=2", { chave: verde });

        assert.equal(r.corpo.dados.length, 1);
        assert.equal(r.corpo.total, 3);
        assert.equal(r.corpo.pagina, 2);
    });

    await t.test("filtros", async () => {
        const porPedido = await s.chamar("GET", "/api/v1/entregas?codigo_pedido_externo=LV-1", { chave: verde });
        const porStatus = await s.chamar("GET", "/api/v1/entregas?status=entregue", { chave: verde });

        assert.equal(porPedido.corpo.total, 1);
        assert.equal(porStatus.corpo.total, 0);
    });

    await t.test("filtros inválidos devolvem 422", async () => {
        const r = await s.chamar("GET", "/api/v1/entregas?status=voando&limite=500", { chave: verde });

        assert.equal(r.status, 422);
        assert.deepEqual(r.corpo.erro.detalhes.map((d) => d.campo).sort(), ["limite", "status"]);
    });

    await t.test("rota inexistente devolve 404 em JSON", async () => {
        const r = await s.chamar("GET", "/api/v1/nada", { chave: verde });

        assert.equal(r.status, 404);
    });
});

test("limites de uso", async (t) => {
    await t.test("limite por chave devolve 429 com Retry-After", async () => {
        const s = await subir({ limitePorMinuto: 3 });

        t.after(s.encerrar);

        const rs = [];

        for (let i = 0; i < 5; i++) {
            rs.push(await s.chamar("GET", "/api/v1/entregas", { chave: s.chaves.LojaVerde }));
        }

        assert.deepEqual(rs.map((r) => r.status), [200, 200, 200, 429, 429]);
        assert.equal(rs[3].corpo.erro.codigo, "LIMITE_EXCEDIDO");
        assert.ok(Number(rs[3].headers.get("retry-after")) > 0);

        // a outra loja não é afetada
        const outra = await s.chamar("GET", "/api/v1/entregas", { chave: s.chaves["Mundo Tech"] });

        assert.equal(outra.status, 200);
    });

    await t.test("muitas tentativas com chave errada bloqueiam o IP (429)", async () => {
        const s = await subir({ falhasPorMinuto: 3 });

        t.after(s.encerrar);

        const rs = [];

        for (let i = 0; i < 5; i++) {
            rs.push(await s.chamar("GET", "/api/v1/entregas", { chave: "errada" + i }));
        }

        assert.deepEqual(rs.map((r) => r.status), [401, 401, 401, 429, 429]);
    });
});
