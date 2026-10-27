// validação do corpo e dos filtros da API
//
// Cada função devolve { valor, detalhes }: se detalhes tiver itens, a requisição é inválida (422).

const STATUS = ["solicitada", "coletada", "saiu_cd", "em_rodovia", "na_cidade", "saiu_entrega", "entregue"];

const ISO = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;

function texto(corpo, campo, max, detalhes, obrigatorio) {
    const v = corpo[campo];

    if (v == null || v === "") {
        if (obrigatorio) {
            detalhes.push({ campo, mensagem: "Campo obrigatório." });
        }

        return null;
    }

    if (typeof v !== "string") {
        detalhes.push({ campo, mensagem: "Deve ser um texto." });
        return null;
    }

    const t = v.trim();

    if (!t) {
        detalhes.push({ campo, mensagem: "Campo obrigatório." });
        return null;
    }

    if (t.length > max) {
        detalhes.push({ campo, mensagem: "Máximo de " + max + " caracteres." });
        return null;
    }

    return t;
}

function validarItens(lista, detalhes) {
    if (!Array.isArray(lista) || lista.length < 1) {
        detalhes.push({ campo: "itens", mensagem: "Informe ao menos um item." });
        return [];
    }

    if (lista.length > 100) {
        detalhes.push({ campo: "itens", mensagem: "Máximo de 100 itens por entrega." });
        return [];
    }

    const itens = [];

    lista.forEach((x, i) => {
        const p = "itens[" + i + "]";
        const e = x && typeof x === "object" ? x : {};
        const descricao = texto(e, "descricao", 150, [], true);

        if (!descricao) {
            detalhes.push({ campo: p + ".descricao", mensagem: "Informe a descrição (até 150 caracteres)." });
        }

        if (!Number.isInteger(e.quantidade) || e.quantidade < 1 || e.quantidade > 100000) {
            detalhes.push({ campo: p + ".quantidade", mensagem: "Deve ser um número inteiro de 1 a 100000." });
        }

        if (typeof e.peso !== "number" || !Number.isFinite(e.peso) || e.peso <= 0 || e.peso > 100000) {
            detalhes.push({ campo: p + ".peso", mensagem: "Deve ser um número maior que 0 (em kg), até 100000." });
        }

        itens.push({ descricao, quantidade: e.quantidade, peso: e.peso });
    });

    return itens;
}

// corpo de POST /entregas
function criarEntrega(corpo, agora, prazoPadraoDias) {
    const detalhes = [];
    const c = corpo && typeof corpo === "object" && !Array.isArray(corpo) ? corpo : {};

    const valor = {
        pedido: texto(c, "codigo_pedido_externo", 60, detalhes, true),
        destinatario: texto(c, "nome_destinatario", 120, detalhes, true),
        origem: texto(c, "endereco_origem", 200, detalhes, true),
        destino: texto(c, "endereco_destino", 200, detalhes, true),
        itens: validarItens(c.itens, detalhes),
        prevista: null
    };

    if (c.data_prevista == null) {
        valor.prevista = new Date(agora.getTime() + prazoPadraoDias * 864e5).toISOString();
    } else if (typeof c.data_prevista !== "string" || !ISO.test(c.data_prevista) || isNaN(Date.parse(c.data_prevista))) {
        detalhes.push({ campo: "data_prevista", mensagem: "Use uma data ISO 8601, ex.: 2026-11-05T18:00:00-03:00." });
    } else if (Date.parse(c.data_prevista) <= agora.getTime()) {
        detalhes.push({ campo: "data_prevista", mensagem: "Deve ser uma data futura." });
    } else {
        valor.prevista = new Date(c.data_prevista).toISOString();
    }

    return { valor, detalhes };
}

// query string de GET /entregas
function filtros(q) {
    const detalhes = [];
    const valor = { pedido: null, status: null, limite: 20, offset: 0, pagina: 1 };

    if (q.codigo_pedido_externo) {
        valor.pedido = String(q.codigo_pedido_externo).trim();
    }

    if (q.status) {
        if (STATUS.indexOf(q.status) < 0) {
            detalhes.push({ campo: "status", mensagem: "Valores aceitos: " + STATUS.join(", ") + "." });
        } else {
            valor.status = q.status;
        }
    }

    if (q.limite != null) {
        const l = Number(q.limite);

        if (!Number.isInteger(l) || l < 1 || l > 100) {
            detalhes.push({ campo: "limite", mensagem: "Deve ser um inteiro de 1 a 100." });
        } else {
            valor.limite = l;
        }
    }

    if (q.pagina != null) {
        const p = Number(q.pagina);

        if (!Number.isInteger(p) || p < 1) {
            detalhes.push({ campo: "pagina", mensagem: "Deve ser um inteiro a partir de 1." });
        } else {
            valor.pagina = p;
        }
    }

    valor.offset = (valor.pagina - 1) * valor.limite;

    return { valor, detalhes };
}

module.exports = { STATUS, criarEntrega, filtros };
