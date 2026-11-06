// Gestão de logins do sistema Korven (só administrador).
// Criar usuário no Supabase Auth exige a chave de serviço, que nunca pode ir para o navegador;
// por isso esta função existe. Toda chamada confere se quem pede é admin.
//
// POST { acao: "listar" }
// POST { acao: "criar", email, senha, nome, perfil, cliente_id?, motorista_id? }
// POST { acao: "atualizar", id, nome?, perfil? }          (perfil só entre admin e operador)
// POST { acao: "redefinir_senha", id, senha }

import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

class Erro extends Error {
  constructor(mensagem: string, public status = 400) {
    super(mensagem);
  }
}

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, "Content-Type": "application/json" } });

const PERFIS = ["admin", "operador", "motorista", "cliente"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function exigirAdmin(req: Request) {
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data, error } = await admin.auth.getUser(token);

  if (error || !data.user) throw new Erro("Sessão inválida. Entre novamente.", 401);

  const { data: u } = await admin.from("usuario").select("perfil_acesso").eq("id", data.user.id).maybeSingle();

  if (u?.perfil_acesso !== "admin") throw new Erro("Somente o administrador gerencia usuários.", 403);

  return data.user.id;
}

function validarSenha(senha: unknown) {
  if (typeof senha !== "string" || senha.length < 8 || senha.length > 72) {
    throw new Erro("A senha precisa ter de 8 a 72 caracteres.");
  }
}

function validarNome(nome: unknown) {
  if (typeof nome !== "string" || nome.trim().length < 2 || nome.trim().length > 80) {
    throw new Erro("Informe o nome (2 a 80 caracteres).");
  }
}

async function listar() {
  const { data: usuarios, error } = await admin
    .from("usuario")
    .select("id, nome, perfil_acesso, data_cadastro")
    .neq("perfil_acesso", "sistema")
    .order("nome");

  if (error) throw error;

  const emails = new Map<string, string>();

  for (let pagina = 1; pagina < 20; pagina++) {
    const { data, error: e } = await admin.auth.admin.listUsers({ page: pagina, perPage: 200 });

    if (e) throw e;

    data.users.forEach((u) => emails.set(u.id, u.email ?? ""));

    if (data.users.length < 200) break;
  }

  const [{ data: clientes }, { data: motoristas }] = await Promise.all([
    admin.from("cliente").select("usuario_id, nome").not("usuario_id", "is", null),
    admin.from("motorista").select("usuario_id, nome").not("usuario_id", "is", null),
  ]);

  const vinculo = new Map<string, string>();

  (clientes ?? []).forEach((c) => vinculo.set(c.usuario_id, `Cliente · ${c.nome}`));
  (motoristas ?? []).forEach((m) => vinculo.set(m.usuario_id, `Motorista · ${m.nome}`));

  return {
    usuarios: (usuarios ?? []).map((u) => ({
      ...u,
      email: emails.get(u.id) ?? "",
      vinculo: vinculo.get(u.id) ?? null,
    })),
  };
}

async function criar(b: Record<string, unknown>) {
  const email = String(b.email ?? "").trim().toLowerCase();
  const perfil = String(b.perfil ?? "");

  if (!EMAIL.test(email)) throw new Erro("Informe um e-mail válido.");
  validarSenha(b.senha);
  validarNome(b.nome);

  if (!PERFIS.includes(perfil)) throw new Erro("Perfil inválido.");

  const tabela = perfil === "cliente" ? "cliente" : perfil === "motorista" ? "motorista" : null;
  const vinculoId = tabela ? String(b[`${tabela}_id`] ?? "") : "";

  if (tabela) {
    if (!vinculoId) throw new Erro(`Escolha o ${tabela} deste acesso.`);

    const { data: alvo } = await admin.from(tabela).select("id, usuario_id").eq("id", vinculoId).maybeSingle();

    if (!alvo) throw new Erro(`${tabela === "cliente" ? "Cliente" : "Motorista"} não encontrado.`);
    if (alvo.usuario_id) throw new Erro("Este cadastro já tem um acesso.");
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: String(b.senha),
    email_confirm: true,
  });

  if (error || !data.user) {
    throw new Erro(/already|registered|exists/i.test(error?.message ?? "") ? "Já existe um acesso com este e-mail." : "Não foi possível criar o acesso.");
  }

  const id = data.user.id;

  try {
    const { error: e1 } = await admin.from("usuario").insert({ id, nome: String(b.nome).trim(), perfil_acesso: perfil });

    if (e1) throw e1;

    if (tabela) {
      const { error: e2 } = await admin.from(tabela).update({ usuario_id: id }).eq("id", vinculoId);

      if (e2) throw e2;
    }
  } catch (_) {
    await admin.auth.admin.deleteUser(id);
    throw new Erro("Não foi possível concluir o cadastro do acesso.", 500);
  }

  return { id };
}

async function atualizar(b: Record<string, unknown>) {
  const id = String(b.id ?? "");
  const { data: alvo } = await admin.from("usuario").select("id, perfil_acesso").eq("id", id).maybeSingle();

  if (!alvo || alvo.perfil_acesso === "sistema") throw new Erro("Usuário não encontrado.", 404);

  const mudar: Record<string, string> = {};

  if (b.nome !== undefined) {
    validarNome(b.nome);
    mudar.nome = String(b.nome).trim();
  }

  if (b.perfil !== undefined && b.perfil !== alvo.perfil_acesso) {
    const novo = String(b.perfil);

    if (!["admin", "operador"].includes(novo) || !["admin", "operador"].includes(alvo.perfil_acesso)) {
      throw new Erro("O perfil só pode alternar entre administrador e operador. Clientes e motoristas são vinculados ao cadastro.");
    }

    if (alvo.perfil_acesso === "admin") {
      const { count } = await admin.from("usuario").select("id", { count: "exact", head: true }).eq("perfil_acesso", "admin");

      if ((count ?? 0) <= 1) throw new Erro("Não é possível tirar o último administrador.");
    }

    mudar.perfil_acesso = novo;
  }

  if (!Object.keys(mudar).length) return { id };

  const { error } = await admin.from("usuario").update(mudar).eq("id", id);

  if (error) throw error;

  return { id };
}

async function redefinirSenha(b: Record<string, unknown>) {
  validarSenha(b.senha);

  const id = String(b.id ?? "");
  const { data: alvo } = await admin.from("usuario").select("perfil_acesso").eq("id", id).maybeSingle();

  if (!alvo || alvo.perfil_acesso === "sistema") throw new Erro("Usuário não encontrado.", 404);

  const { error } = await admin.auth.admin.updateUserById(id, { password: String(b.senha) });

  if (error) throw new Erro("Não foi possível redefinir a senha.");

  return { id };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return resposta({ erro: "Método não permitido." }, 405);

  try {
    await exigirAdmin(req);

    const corpo = await req.json().catch(() => ({}));

    switch (corpo.acao) {
      case "listar": return resposta(await listar());
      case "criar": return resposta(await criar(corpo), 201);
      case "atualizar": return resposta(await atualizar(corpo));
      case "redefinir_senha": return resposta(await redefinirSenha(corpo));
      default: throw new Erro("Ação desconhecida.");
    }
  } catch (e) {
    if (e instanceof Erro) return resposta({ erro: e.message }, e.status);

    console.error(e);
    return resposta({ erro: "Erro interno." }, 500);
  }
});
