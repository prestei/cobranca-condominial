import { escopoCondominios, escopoUnidades, formatarData, type Condominio, type Unidade } from "@/data/catalogo";
import { getCadastros } from "@/data/catalogo-store";
import { codigoReDoUsuario, identificadorColaboradorPorId } from "@/lib/colaboradores/re-server";
import { listarFilaCobranca, type FilaCobrancaItem } from "@/lib/fila/service";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

export class BuscaGlobalError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export const LIMITES_BUSCA_GLOBAL = {
  porCategoria: 8,
  termoMinimo: 2,
} as const;

export type BuscaGlobalCategoriaId = "re" | "condominios" | "unidades" | "cobrancas" | "atendimentos";

export type BuscaGlobalItem = {
  id: string;
  categoria: BuscaGlobalCategoriaId;
  titulo: string;
  subtitulo: string;
  href: string;
};

export type BuscaGlobalCategoria = {
  id: BuscaGlobalCategoriaId;
  rotulo: string;
  itens: BuscaGlobalItem[];
};

export type BuscaGlobalResultado = {
  termo: string;
  categorias: BuscaGlobalCategoria[];
};

function usuarioVeCarteiraGeral(userId: number) {
  return temPermissao(permissoesDoUsuarioId(userId), "usuarios", "criar");
}

function normalizarTermo(termo: string) {
  return termo.trim().toLocaleLowerCase("pt-BR");
}

function labelUnidade(unidade: Pick<Unidade, "identificacao" | "bloco">) {
  return unidade.bloco ? `${unidade.identificacao} · ${unidade.bloco}` : unidade.identificacao;
}

function nomeCondominio(id: number) {
  return getCadastros().condominios.find((item) => item.id === id)?.nome ?? "—";
}

function atendimentosNaCarteiraBusca(userId: number) {
  const idsFila = new Set(listarFilaCobranca(userId).map((item) => item.unidadeId));
  const geral = usuarioVeCarteiraGeral(userId);
  const idsEscopo = new Set(escopoUnidades(getCadastros(), userId).map((item) => item.id));
  return getCadastros().atendimentos.filter((item) => {
    const unidadeId = Number(item.unidadeId);
    if (!idsEscopo.has(unidadeId)) return false;
    if (geral) return idsFila.has(unidadeId) || idsEscopo.has(unidadeId);
    return idsFila.has(unidadeId);
  });
}

function buscarRe(userId: number, termo: string): BuscaGlobalItem[] {
  const geral = usuarioVeCarteiraGeral(userId);
  const perm = permissoesDoUsuarioId(userId);
  if (!temPermissao(perm, "atendimentos", "ler")) return [];

  const fila = listarFilaCobranca(userId);
  const reNaFila = new Map<string, number>();
  for (const item of fila) {
    const re = item.codigoRe?.trim().toUpperCase();
    if (!re) continue;
    if (!re.includes(termo.toUpperCase()) && !re.toLocaleLowerCase("pt-BR").includes(termo)) continue;
    reNaFila.set(re, (reNaFila.get(re) ?? 0) + 1);
  }

  if (!geral) {
    const usuarioLogado = getCadastros().usuarios.find((u) => u.id === userId);
    const proprio = usuarioLogado ? codigoReDoUsuario(usuarioLogado) : null;
    if (proprio) {
      const key = proprio.toUpperCase();
      if (key.includes(termo.toUpperCase()) && !reNaFila.has(key)) {
        reNaFila.set(key, fila.filter((item) => item.codigoRe?.toUpperCase() === key).length);
      }
    }
  } else if (temPermissao(perm, "usuarios", "ler")) {
    for (const usuario of getCadastros().usuarios) {
      const re = codigoReDoUsuario(usuario);
      if (!re) continue;
      const key = re.toUpperCase();
      if (!key.includes(termo.toUpperCase()) && !re.toLocaleLowerCase("pt-BR").includes(termo)) continue;
      if (!reNaFila.has(key)) {
        const total = listarFilaCobranca(userId, { codigoRe: re }).length;
        if (total > 0) reNaFila.set(key, total);
      }
    }
  }

  return [...reNaFila.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
    .slice(0, LIMITES_BUSCA_GLOBAL.porCategoria)
    .map(([re, total]) => ({
      id: `re:${re}`,
      categoria: "re" as const,
      titulo: re,
      subtitulo: `${total} cobrança${total === 1 ? "" : "s"} na carteira`,
      href: `/atendimentos?codigoRe=${encodeURIComponent(re)}&q=${encodeURIComponent(re)}`,
    }));
}

function buscarCondominios(userId: number, termo: string): BuscaGlobalItem[] {
  if (!temPermissao(permissoesDoUsuarioId(userId), "condominios", "ler")) return [];
  return escopoCondominios(getCadastros(), userId)
  .filter((item: Condominio) => item.nome.toLocaleLowerCase("pt-BR").includes(termo))
  .slice(0, LIMITES_BUSCA_GLOBAL.porCategoria)
  .map((item) => ({
    id: `condominio:${item.id}`,
    categoria: "condominios" as const,
    titulo: item.nome,
    subtitulo: item.status === "Inativo" ? "Condomínio inativo" : "Condomínio",
    href: `/debitos?condominioId=${item.id}`,
  }));
}

function buscarUnidades(userId: number, termo: string): BuscaGlobalItem[] {
  if (!temPermissao(permissoesDoUsuarioId(userId), "unidades", "ler")) return [];
  return escopoUnidades(getCadastros(), userId)
    .filter((item) => {
      const condominio = nomeCondominio(item.condominioId);
      const texto = `${item.identificacao} ${item.bloco} ${condominio}`.toLocaleLowerCase("pt-BR");
      return texto.includes(termo);
    })
    .slice(0, LIMITES_BUSCA_GLOBAL.porCategoria)
    .map((item) => ({
      id: `unidade:${item.id}`,
      categoria: "unidades" as const,
      titulo: labelUnidade(item),
      subtitulo: nomeCondominio(item.condominioId),
      href: `/atendimentos?unidade=${item.id}`,
    }));
}

function buscarCobrancas(userId: number, termo: string): BuscaGlobalItem[] {
  if (!temPermissao(permissoesDoUsuarioId(userId), "atendimentos", "ler")) return [];
  const fila = listarFilaCobranca(userId, { busca: termo });
  return fila.slice(0, LIMITES_BUSCA_GLOBAL.porCategoria).map((item: FilaCobrancaItem) => ({
    id: `cobranca:${item.unidadeId}`,
    categoria: "cobrancas" as const,
    titulo: `${labelUnidade(item)} — ${nomeCondominio(item.condominioId)}`,
    subtitulo: [item.situacao, item.codigoRe ? `RE ${item.codigoRe}` : "Sem RE", item.valorInadimplencia ?? ""]
      .filter(Boolean)
      .join(" · "),
    href: `/atendimentos?unidade=${item.unidadeId}`,
  }));
}

function buscarAtendimentos(userId: number, termo: string): BuscaGlobalItem[] {
  if (!temPermissao(permissoesDoUsuarioId(userId), "atendimentos", "ler")) return [];
  const lista = atendimentosNaCarteiraBusca(userId)
    .filter((item) => {
      const autorRe = identificadorColaboradorPorId(item.usuarioId);
      const unidade = getCadastros().unidades.find((u) => u.id === Number(item.unidadeId));
      const condominio = unidade ? nomeCondominio(unidade.condominioId) : "";
      const label = unidade ? labelUnidade(unidade) : String(item.unidadeId);
      const texto = `${item.assunto} ${item.descricao} ${item.motivo} ${item.canal} ${autorRe} ${condominio} ${label}`.toLocaleLowerCase(
        "pt-BR",
      );
      return texto.includes(termo);
    })
    .sort((a, b) => b.dataHora.localeCompare(a.dataHora))
    .slice(0, LIMITES_BUSCA_GLOBAL.porCategoria);

  return lista.map((item) => {
    const unidade = getCadastros().unidades.find((u) => u.id === Number(item.unidadeId));
    const subtitulo = [
      formatarData(item.dataHora),
      identificadorColaboradorPorId(item.usuarioId),
      unidade ? `${labelUnidade(unidade)} · ${nomeCondominio(unidade.condominioId)}` : "",
    ]
      .filter(Boolean)
      .join(" · ");
    return {
      id: `atendimento:${item.id}`,
      categoria: "atendimentos" as const,
      titulo: item.assunto?.trim() || item.canal || "Atendimento",
      subtitulo,
      href: `/atendimentos?atendimento=${encodeURIComponent(item.id)}&unidade=${item.unidadeId}`,
    };
  });
}

const ROTULOS: Record<BuscaGlobalCategoriaId, string> = {
  re: "Código RE",
  condominios: "Condomínios",
  unidades: "Unidades",
  cobrancas: "Cobranças na carteira",
  atendimentos: "Atendimentos",
};

export function buscarGlobalDashboard(userId: number, termoBruto: string): BuscaGlobalResultado {
  const termo = normalizarTermo(termoBruto);
  if (termo.length < LIMITES_BUSCA_GLOBAL.termoMinimo) {
    throw new BuscaGlobalError(`Informe ao menos ${LIMITES_BUSCA_GLOBAL.termoMinimo} caracteres para buscar.`, 400);
  }

  const blocos = (
    [
      { id: "re" as const, rotulo: ROTULOS.re, itens: buscarRe(userId, termo) },
      { id: "condominios" as const, rotulo: ROTULOS.condominios, itens: buscarCondominios(userId, termo) },
      { id: "unidades" as const, rotulo: ROTULOS.unidades, itens: buscarUnidades(userId, termo) },
      { id: "cobrancas" as const, rotulo: ROTULOS.cobrancas, itens: buscarCobrancas(userId, termo) },
      { id: "atendimentos" as const, rotulo: ROTULOS.atendimentos, itens: buscarAtendimentos(userId, termo) },
    ] satisfies BuscaGlobalCategoria[]
  ).filter((item) => item.itens.length > 0);

  return { termo: termoBruto.trim(), categorias: blocos };
}
