import {
  type AcaoPermissao,
  type ModuloPermissao,
  MODULOS_PERMISSAO,
  type PermissoesCargo,
  acoesDoModulo,
} from "@/lib/permissions/modulos";

const CRUD_COMPLETO: Partial<Record<AcaoPermissao, boolean>> = {
  ler: true,
  criar: true,
  editar: true,
  excluir: true,
};

const SOMENTE_LER: Partial<Record<AcaoPermissao, boolean>> = { ler: true };

function mergeModulo(
  target: PermissoesCargo,
  modulo: ModuloPermissao,
  acoes: Partial<Record<AcaoPermissao, boolean>>,
) {
  const atual = target[modulo] ?? {};
  target[modulo] = { ...atual, ...acoes };
}

function crudSemExcluir(): Partial<Record<AcaoPermissao, boolean>> {
  return { ler: true, criar: true, editar: true };
}

/** Converte chaves legadas (booleanas planas) para o modelo por módulo e ação. */
function migrarLegado(record: Record<string, unknown>): PermissoesCargo {
  const out: PermissoesCargo = {};

  if (record.cadastros === true) {
    for (const modulo of ["condominios", "unidades", "usuarios", "cargos"] as ModuloPermissao[]) {
      mergeModulo(out, modulo, CRUD_COMPLETO);
    }
    mergeModulo(out, "importacoes", CRUD_COMPLETO);
    mergeModulo(out, "debitos", CRUD_COMPLETO);
  }
  if (record.atendimentos === true) {
    mergeModulo(out, "atendimentos", crudSemExcluir());
    mergeModulo(out, "dashboard", SOMENTE_LER);
  }
  if (record.retornos === true) {
    mergeModulo(out, "atendimentos", { editar: true, ler: true });
    mergeModulo(out, "dashboard", SOMENTE_LER);
  }
  if (record.relatorios === true) {
    mergeModulo(out, "relatorios", { ler: true });
    mergeModulo(out, "dashboard", SOMENTE_LER);
  }
  if (record.historico === true) {
    mergeModulo(out, "unidades", SOMENTE_LER);
    mergeModulo(out, "condominios", SOMENTE_LER);
    mergeModulo(out, "debitos", SOMENTE_LER);
    mergeModulo(out, "relatorios", { ler: true });
  }
  if (record.exportacoes === true) {
    mergeModulo(out, "relatorios", { exportar: true, ler: true });
  }
  if (record.correcoes === true) {
    for (const modulo of ["atendimentos", "debitos", "condominios", "unidades", "importacoes"] as ModuloPermissao[]) {
      mergeModulo(out, modulo, { ler: true, editar: true });
    }
  }
  if (record.auditoria === true) {
    mergeModulo(out, "auditoria", SOMENTE_LER);
  }

  return out;
}

function isModuloPermissao(value: string): value is ModuloPermissao {
  return MODULOS_PERMISSAO.some((item) => item.id === value);
}

export function permissoesVazias(): PermissoesCargo {
  return {};
}

export function parsePermissoesJson(json: string): PermissoesCargo {
  if (!json.trim()) return permissoesVazias();
  try {
    const parsed: unknown = JSON.parse(json);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return permissoesVazias();
    const record = parsed as Record<string, unknown>;

    const legado = ["cadastros", "atendimentos", "retornos", "relatorios", "historico", "exportacoes", "correcoes", "auditoria"];
    if (legado.some((key) => record[key] === true)) {
      return migrarLegado(record);
    }

    const out: PermissoesCargo = {};
    for (const [key, value] of Object.entries(record)) {
      if (!isModuloPermissao(key) || !value || typeof value !== "object" || Array.isArray(value)) continue;
      const acoes = value as Record<string, unknown>;
      const moduloAcoes: Partial<Record<AcaoPermissao, boolean>> = {};
      for (const acao of acoesDoModulo(key)) {
        if (acoes[acao] === true) moduloAcoes[acao] = true;
      }
      if (Object.keys(moduloAcoes).length > 0) out[key] = moduloAcoes;
    }
    return out;
  } catch {
    return permissoesVazias();
  }
}

export function serializarPermissoes(permissoes: PermissoesCargo): string {
  const limpo: PermissoesCargo = {};
  for (const modulo of MODULOS_PERMISSAO) {
    const acoes = permissoes[modulo.id];
    if (!acoes) continue;
    const filtrado: Partial<Record<AcaoPermissao, boolean>> = {};
    for (const acao of modulo.acoes) {
      if (acoes[acao] === true) filtrado[acao] = true;
    }
    if (Object.keys(filtrado).length > 0) limpo[modulo.id] = filtrado;
  }
  return JSON.stringify(limpo);
}

const ROTULO_ACAO: Record<AcaoPermissao, string> = {
  ler: "ver",
  criar: "criar",
  editar: "editar",
  excluir: "excluir",
  exportar: "exportar",
};

export function resumoPermissoes(permissoes: PermissoesCargo): string {
  const partes: string[] = [];
  for (const modulo of MODULOS_PERMISSAO) {
    const acoes = permissoes[modulo.id];
    if (!acoes) continue;
    const ativas = modulo.acoes.filter((acao) => acoes[acao] === true).map((acao) => ROTULO_ACAO[acao]);
    if (ativas.length > 0) partes.push(`${modulo.label} (${ativas.join(", ")})`);
  }
  return partes.join(" · ");
}

export function cargoTemAlgumaPermissao(permissoes: PermissoesCargo): boolean {
  return MODULOS_PERMISSAO.some((modulo) => {
    const acoes = permissoes[modulo.id];
    return acoes && modulo.acoes.some((acao) => acoes[acao] === true);
  });
}

/** Todas as ações disponíveis em cada módulo (atalho para perfil administrador). */
export function permissoesAcessoCompleto(): PermissoesCargo {
  const out: PermissoesCargo = {};
  for (const modulo of MODULOS_PERMISSAO) {
    const acoes: Partial<Record<AcaoPermissao, boolean>> = {};
    for (const acao of modulo.acoes) {
      acoes[acao] = true;
    }
    out[modulo.id] = acoes;
  }
  return out;
}

/** Apenas consulta onde o módulo permite. */
export function permissoesSomenteConsulta(): PermissoesCargo {
  const out: PermissoesCargo = {};
  for (const modulo of MODULOS_PERMISSAO) {
    if (modulo.acoes.includes("ler")) {
      out[modulo.id] = { ler: true };
    }
  }
  return out;
}

export function permissoesModuloCompleto(moduloId: ModuloPermissao): Partial<Record<AcaoPermissao, boolean>> {
  const modulo = MODULOS_PERMISSAO.find((item) => item.id === moduloId);
  if (!modulo) return {};
  const acoes: Partial<Record<AcaoPermissao, boolean>> = {};
  for (const acao of modulo.acoes) {
    acoes[acao] = true;
  }
  return acoes;
}
