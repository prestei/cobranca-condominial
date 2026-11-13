#!/usr/bin/env node
/**
 * Roteiro T21 via HTTP contra `npm run dev` (PostgreSQL quando DATABASE_URL está ativo).
 * Uso: node scripts/e2e-t21-http.mjs [--base http://127.0.0.1:3000]
 */
import { writeFileSync } from "node:fs";

const base = process.argv.find((a) => a.startsWith("--base="))?.slice(7) ?? "http://127.0.0.1:3000";
const SENHA = "12345";
const results = [];

function log(id, nome, ok, detalhe = "") {
  results.push({ id, nome, ok, detalhe });
  const mark = ok ? "PASSOU" : "FALHOU";
  console.log(`[${mark}] T21-${id} ${nome}${detalhe ? ` — ${detalhe}` : ""}`);
}

async function login(codigo) {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ codigo, password: SENHA }),
  });
  const body = await res.json().catch(() => ({}));
  const setCookie = res.headers.getSetCookie?.() ?? [];
  const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
  if (!res.ok) throw new Error(`login ${codigo}: ${body.error ?? res.status}`);
  return { cookie, user: body.user, permissoes: body.permissoes };
}

async function api(cookie, path, init = {}) {
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Cookie: cookie,
      ...(init.body && !(init.headers ?? {})["Content-Type"]
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  const text = await res.text();
  let json;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text.slice(0, 200) };
  }
  return { status: res.status, json };
}

async function main() {
  const runId = Date.now();
  const suf = `E2E-${runId}`;

  // 1 — login por perfil
  for (const codigo of ["MILENA", "RAQUEL", "ADRYELLE"]) {
    try {
      const s = await login(codigo);
      const dash = await api(s.cookie, "/api/dashboard");
      log("01", `Login ${codigo}`, dash.status === 200 && dash.json?.dashboard?.perfil, dash.json?.dashboard?.perfil);
      await api(s.cookie, "/api/auth/logout", { method: "POST" });
    } catch (e) {
      log("01", `Login ${codigo}`, false, String(e.message ?? e));
    }
  }

  const admin = await login("MILENA");
  const atd = await login("RAQUEL");
  const adv = await login("ADRYELLE");

  // 2 — cadastro condomínio + unidade
  let condoId;
  let unitId;
  {
    const condo = await api(admin.cookie, "/api/condominios", {
      method: "POST",
      body: JSON.stringify({
        nome: `Condomínio ${suf}`,
        identificadorExterno: suf,
        status: "Ativo",
        advogados: ["Dra. Adryelle"],
        administradora: "E2E",
        cep: "40000-000",
        logradouro: "Rua E2E",
        numero: "1",
        cidade: "Salvador",
        estado: "BA",
        observacao: "T21 browser/http",
      }),
    });
    condoId = condo.json?.condominio?.id;
    log("02", "POST condomínio", condo.status === 201 && condoId, `id=${condoId}`);

    const unit = await api(admin.cookie, "/api/unidades", {
      method: "POST",
      body: JSON.stringify({
        condominioId: condoId,
        identificacao: "E2E-01",
        bloco: "A",
        tipo: "Apartamento",
        status: "Ativa",
        situacao: "Em cobrança",
      }),
    });
    unitId = unit.json?.unidade?.id;
    log("02", "POST unidade", unit.status === 201 && unitId, `id=${unitId}`);
  }

  // 3 — RE único (novo atendente)
  let novoRe;
  {
    const cargoList = await api(admin.cookie, "/api/cargos");
    const atendenteCargo = cargoList.json?.cargos?.find((c) => c.nome === "Atendente");
    const created = await api(admin.cookie, "/api/usuarios", {
      method: "POST",
      body: JSON.stringify({
        codigo: `ATD${Date.now()}`,
        cargoId: atendenteCargo?.id ?? 2,
        nome: `Atendente ${suf}`,
        email: `atd.${suf.toLowerCase()}@example.invalid`,
        telefone: "",
        senha: SENHA,
        ativo: true,
      }),
    });
    novoRe = created.json?.usuario?.codigoRe;
    log(
      "03",
      "RE novo atendente",
      created.status === 201 && /^RE-\d{5}$/.test(novoRe ?? ""),
      novoRe ?? created.json?.error ?? String(created.status),
    );
  }

  // 4 — distribuição
  if (unitId) {
    const dist = await api(admin.cookie, "/api/distribuicao/atribuicoes", {
      method: "POST",
      body: JSON.stringify({
        unidadeIds: [unitId],
        codigoRe: "RE-10000",
        motivo: `T21 ${suf}`,
      }),
    });
    log("04", "Distribuir unidade (RAQUEL)", dist.status === 200 && (dist.json?.atribuidas ?? 0) >= 1, JSON.stringify(dist.json?.atribuidas));
  }

  // 5–6 — atendimento + retorno (carteira RAQUEL, antes da redistribuição)
  let atendimentoId;
  if (unitId && condoId) {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const dataRetorno = `${amanha.toISOString().slice(0, 10)}T10:00:00`;
    const atdPost = await api(atd.cookie, "/api/atendimentos", {
      method: "POST",
      body: JSON.stringify({
        condominioId: condoId,
        unidadeId: unitId,
        canal: "Telefone",
        respondeu: "Não",
        assunto: `T21 ${suf}`,
        descricao: "Contato E2E",
        status: "Pendente",
        motivo: "Esqueceu o vencimento",
        dataProximaAcao: dataRetorno,
        proximaAcao: "Nova tentativa",
      }),
    });
    atendimentoId = atdPost.json?.atendimento?.id;
    log(
      "05",
      "Registrar atendimento",
      atdPost.status === 201 && atendimentoId,
      atendimentoId ? `id=${atendimentoId}` : atdPost.json?.error ?? String(atdPost.status),
    );

    if (atendimentoId) {
      const concl = await api(atd.cookie, `/api/atendimentos/${atendimentoId}/concluir-retorno`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      log("06", "Concluir retorno", concl.status === 200 && concl.json?.atendimento?.retornoConcluidoEm, "");
      const hist = await api(admin.cookie, `/api/unidades/${unitId}/historico`);
      const tipos = new Set((hist.json?.eventos ?? []).map((e) => e.tipo));
      log("06", "Histórico unidade", hist.status === 200 && tipos.has("tentativa"), [...tipos].join(","));
    }
  }

  // 4b — redistribuição após contato (TASSIA)
  if (unitId) {
    const redist = await api(admin.cookie, "/api/distribuicao/atribuicoes", {
      method: "POST",
      body: JSON.stringify({
        unidadeIds: [unitId],
        codigoRe: "RE-10001",
        motivo: `T21 redist ${suf}`,
      }),
    });
    log("04", "Redistribuir unidade", redist.status === 200 && redist.json?.atribuidas === 1, "RE-10001");
  }

  // Jurídico — encaminhamento (admin cria)
  if (unitId && condoId) {
    const deb = await api(admin.cookie, `/api/debitos?unidadeId=${unitId}`);
    const debitoId = deb.json?.debitos?.[0]?.id;
    const jur = await api(admin.cookie, "/api/juridico/encaminhamentos", {
      method: "POST",
      body: JSON.stringify({
        condominioId: condoId,
        unidadeId: unitId,
        advogadoResponsavel: "Dra. Adryelle",
        observacoes: `Encaminhamento ${suf}`,
        debitoIds: debitoId ? [debitoId] : [],
      }),
    });
    log("JUR", "Encaminhamento jurídico", jur.status === 201, jur.json?.encaminhamento?.status ?? jur.json?.error);
    const listaAdv = await api(adv.cookie, "/api/juridico/encaminhamentos");
    log("JUR", "Advogado lista jurídico", listaAdv.status === 200, `count=${listaAdv.json?.encaminhamentos?.length ?? 0}`);
  }

  // 10 — importação inválida (CSV malformado)
  {
    const csv = "coluna;apenas\n1;2\n";
    const blob = new Blob([csv], { type: "text/csv" });
    const fd = new FormData();
    fd.append("arquivo", blob, "invalido-e2e.csv");
    fd.append("modulo", "debitos");
    const prev = await fetch(`${base}/api/importacoes/debitos/preview`, {
      method: "POST",
      headers: { Cookie: atd.cookie },
      body: fd,
    });
    const body = await prev.json().catch(() => ({}));
    const erros = body?.preview?.resumo?.erros ?? body?.preview?.linhasComErro ?? body?.error;
    log("10", "Importação inválida (prévia)", prev.status === 200 || prev.status === 400, String(erros ?? prev.status));
  }

  // 11 — editar débito + auditoria
  {
    const lista = await api(admin.cookie, "/api/debitos?pageSize=1");
    const deb = lista.json?.debitos?.[0];
    if (deb?.id) {
      const det = await api(admin.cookie, `/api/debitos/${deb.id}`);
      const atual = det.json?.debito ?? deb;
      const patch = await api(admin.cookie, `/api/debitos/${deb.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          condominioId: atual.condominioId,
          unidadeId: atual.unidadeId,
          referencia: atual.referencia,
          descricao: `Ajuste E2E ${suf}`,
          dataVencimento: atual.dataVencimento,
          valor: atual.valor,
          valorOriginal: atual.valorOriginal ?? atual.valor,
          multa: atual.multa ?? "0.00",
          juros: atual.juros ?? "0.00",
          correcao: atual.correcao ?? "0.00",
          valorAtualizado: atual.valorAtualizado ?? atual.valor,
          status: atual.status,
          origem: atual.origem,
          identificadorExterno: atual.identificadorExterno,
        }),
      });
      log("11", "PATCH débito", patch.status === 200, `id=${deb.id}`);
      const aud = await api(admin.cookie, "/api/auditoria?pageSize=20");
      const hit = (aud.json?.auditoria ?? []).some((a) => a.entidade === "debt");
      log("11", "Auditoria após PATCH", aud.status === 200 && hit, `registros=${aud.json?.auditoria?.length ?? 0}`);
    } else {
      log("11", "PATCH débito", false, "sem débito na base");
    }
  }

  // 8 — escopo advogado
  if (unitId) {
    const ok = await api(adv.cookie, `/api/unidades/${unitId}`);
    const forbidden = await api(adv.cookie, "/api/unidades/99999");
    log("08", "Advogado unidade permitida", ok.status === 200, `status=${ok.status}`);
    log("08", "Advogado unidade proibida", forbidden.status === 403 || forbidden.status === 404, `status=${forbidden.status}`);
  }

  // 9 — produtividade
  {
    const relAdmin = await api(admin.cookie, "/api/relatorios/produtividade?de=2020-01-01&ate=2035-12-31");
    const relAtd = await api(atd.cookie, "/api/relatorios/produtividade?de=2020-01-01&ate=2035-12-31");
    log("09", "Produtividade admin", relAdmin.status === 200, "");
    log("09", "Produtividade atendente bloqueado", relAtd.status === 403, `status=${relAtd.status}`);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok);
  const dia = new Date().toISOString().slice(0, 10);
  const out = `docs/testes/relatorio-e2e-t21-${dia}.md`;
  const md = [
    `# E2E T21 — ${dia} (run ${runId})`,
    "",
    `Base: ${base}`,
    "",
    `**Total:** ${results.length} | **Passou:** ${passed} | **Falhou:** ${failed.length}`,
    "",
    "| ID | Cenário | Status | Detalhe |",
    "| --- | --- | --- | --- |",
    ...results.map((r) => `| ${r.id} | ${r.nome} | ${r.ok ? "PASSOU" : "FALHOU"} | ${r.detalhe} |`),
    "",
    failed.length ? `## Falhas\n\n${failed.map((f) => `- ${f.id} ${f.nome}: ${f.detalhe}`).join("\n")}` : "## Sem falhas",
  ].join("\n");
  writeFileSync(out, md);
  console.log(`\nRelatório: ${out}`);
  process.exitCode = failed.length ? 1 : 0;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
