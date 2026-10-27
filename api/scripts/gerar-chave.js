// gera a chave de API de uma loja e a linha para o CLIENTES do .env
//
// Uso: npm run gerar-chave -- "LojaVerde"
// A chave é mostrada só agora; entregue-a à loja. No servidor fica apenas o hash.

const crypto = require("node:crypto");
const { hashDaChave } = require("../src/middlewares/autenticar");

const nome = (process.argv[2] || "").trim();

if (!nome || nome.length > 100 || /[:,]/.test(nome)) {
    console.error('Informe o nome da loja (até 100 caracteres, sem ":" nem ","). Ex.: npm run gerar-chave -- "LojaVerde"');
    process.exit(1);
}

const chave = "kv_live_" + crypto.randomBytes(24).toString("base64url");

console.log("Loja: " + nome);
console.log("Chave de API (entregue à loja, não é exibida novamente):");
console.log("  " + chave);
console.log("");
console.log("Acrescente ao CLIENTES do .env (separe várias lojas por vírgula):");
console.log("  " + nome + ":" + hashDaChave(chave));
