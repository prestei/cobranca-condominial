import { readFile } from "node:fs/promises";
import path from "node:path";
import { guiaPorId, guiasAjudaVisiveis, type GuiaManual } from "@/lib/ajuda/manual-guias";
import { temPermissao } from "@/lib/permissions/check";
import {
  ACOES_PERMISSAO,
  MODULOS_PERMISSAO,
  moduloDaRota,
  type ModuloPermissao,
  type PermissoesCargo,
} from "@/lib/permissions/modulos";
import type { PerfilOperacional } from "@/lib/perfil-operacional";

const DOCS_MODULO: Partial<Record<ModuloPermissao, string>> = {
  dashboard: "dashboard.md",
  atendimentos: "atendimentos.md",
  debitos: "debitos.md",
  juridico: "juridico.md",
  negociacoes: "negociacoes.md",
  condominios: "condominios.md",
  unidades: "unidades.md",
  relatorios: "relatorios.md",
  importacoes: "importacoes.md",
  usuarios: "usuarios.md",
  cargos: "cargos.md",
  auditoria: "auditoria.md",
};

const MAX_DOC_CHARS = 14_000;
const MAX_GUIA_CHARS = 6_000;

function repoRoot(): string {
  return process.cwd();
}

async function readDocModulo(modulo: ModuloPermissao): Promise<string | null> {
  const file = DOCS_MODULO[modulo];
  if (!file) return null;
  try {
    const full = path.join(repoRoot(), "docs", "modulos", file);
    const raw = await readFile(full, "utf8");
    return raw.length > MAX_DOC_CHARS ? `${raw.slice(0, MAX_DOC_CHARS)}\n\n[… documento truncado …]` : raw;
  } catch {
    return null;
  }
}

function resumirPermissoes(permissoes: PermissoesCargo): string {
  const linhas: string[] = [];
  for (const mod of MODULOS_PERMISSAO) {
    const acoes = ACOES_PERMISSAO.filter((a) => temPermissao(permissoes, mod.id, a.id)).map((a) => a.label);
    if (acoes.length === 0) {
      linhas.push(`${mod.label}: sem acesso`);
      continue;
    }
    linhas.push(`${mod.label} (${mod.description}): ${acoes.join(", ")}`);
  }
  return linhas.join("\n");
}

function serializarGuia(guia: GuiaManual): string {
  const extras: string[] = [];
  if (guia.passos?.length) {
    extras.push("Por onde começar:", ...guia.passos.map((p, i) => `${i + 1}. ${p.titulo} — ${p.descricao}`));
  }
  if (guia.dicas?.length) {
    extras.push("Vale lembrar:", ...guia.dicas.map((d) => `- ${d}`));
  }
  const bloco = [
    `### ${guia.titulo}`,
    guia.resumo,
    `Para que serve: ${guia.objetivo}`,
    "Regras desta tela (priorize estas respostas — linguagem simples, sem termos técnicos):",
    ...guia.regras.map((r) => `- ${r}`),
    ...extras,
  ].join("\n");
  return bloco.length > MAX_GUIA_CHARS ? `${bloco.slice(0, MAX_GUIA_CHARS)}\n[… guia truncado …]` : bloco;
}

function guiaIdPorPathname(pathname: string): string | undefined {
  const map: Array<{ prefix: string; id: string }> = [
    { prefix: "/atendimentos", id: "atendimentos" },
    { prefix: "/minha-agenda", id: "agenda" },
    { prefix: "/debitos", id: "inadimplencia" },
    { prefix: "/negociacoes", id: "negociacoes" },
    { prefix: "/juridico", id: "juridico" },
    { prefix: "/condominios", id: "condominios" },
    { prefix: "/unidades", id: "unidades" },
    { prefix: "/relatorios", id: "relatorios" },
    { prefix: "/importacoes", id: "importacoes" },
    { prefix: "/usuarios", id: "colaboradores" },
    { prefix: "/cargos", id: "cargos" },
    { prefix: "/auditoria", id: "auditoria" },
    { prefix: "/notificacoes", id: "notificacoes" },
    { prefix: "/conta", id: "conta" },
  ];
  if (pathname === "/" || pathname.startsWith("/?")) return "inicio";
  if (pathname === "/ajuda" || pathname.startsWith("/ajuda/")) return undefined;
  const match = map.find((item) => pathname === item.prefix || pathname.startsWith(`${item.prefix}/`));
  return match?.id;
}

export type PacoteConhecimento = {
  modulo: ModuloPermissao;
  matrizPermissoes: string;
  docModulo: string | null;
  guiaAtual: string | null;
  indiceGuias: string;
};

export async function montarConhecimentoAssistente(input: {
  pathname: string;
  permissoes: PermissoesCargo;
  perfil: PerfilOperacional;
}): Promise<PacoteConhecimento> {
  const modulo = moduloDaRota(input.pathname);
  const pode = (mod: ModuloPermissao, acao: "ler") => temPermissao(input.permissoes, mod, acao);
  const guias = guiasAjudaVisiveis(pode, input.perfil);

  const indiceGuias = guias.map((g) => `- ${g.titulo} (${g.href}): ${g.resumo}`).join("\n");

  const guiaId = guiaIdPorPathname(input.pathname);
  const guia = guiaId ? guiaPorId(guiaId) : undefined;
  const guiaAtual =
    guia &&
    pode(guia.modulo, "ler") &&
    (!guia.perfis || guia.perfis.includes(input.perfil))
      ? serializarGuia(guia)
      : null;

  const docModulo = pode(modulo, "ler") ? await readDocModulo(modulo) : null;

  return {
    modulo,
    matrizPermissoes: resumirPermissoes(input.permissoes),
    docModulo,
    guiaAtual,
    indiceGuias,
  };
}
