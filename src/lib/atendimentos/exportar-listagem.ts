import type { TableExportFormat } from "@/components/table";
import { exportarCsv, exportarExcel, exportarPdf } from "@/lib/exportar";

type ToastApi = (options: {
  variant?: "success" | "error" | "info";
  title: string;
  description?: string;
}) => void;

export function exportarListagem(
  toast: ToastApi,
  formato: TableExportFormat,
  titulo: string,
  arquivoBase: string,
  colunas: string[],
  linhas: string[][],
) {
  if (linhas.length === 0) {
    toast({
      variant: "info",
      title: "Nada para exportar",
      description: "Ajuste os filtros ou aguarde dados na listagem.",
    });
    return;
  }
  if (formato === "csv") {
    exportarCsv(`${arquivoBase}.csv`, colunas, linhas);
    toast({ variant: "success", title: "CSV baixado" });
    return;
  }
  if (formato === "xls") {
    exportarExcel(`${arquivoBase}.xls`, colunas, linhas);
    toast({ variant: "success", title: "Planilha baixada" });
    return;
  }
  const abriu = exportarPdf(titulo, `${arquivoBase}.html`, [{ titulo: "Listagem (filtros aplicados)", colunas, linhas }]);
  if (abriu) {
    toast({ variant: "success", title: "PDF", description: "Use imprimir ou salvar como PDF no navegador." });
  } else {
    toast({
      variant: "info",
      title: "Relatório baixado",
      description: "Abra o arquivo HTML e use imprimir para salvar em PDF.",
    });
  }
}

export function linhasFilaExport(
  itens: Array<{
    condominioId: number;
    identificacao: string;
    bloco: string;
    valorInadimplencia: string | null;
    diasAtrasoMax: number;
    situacao: string;
    codigoRe: string | null;
    ultimoAtendimento: string | null;
    proximoRetorno: string | null;
    retornoSituacao: string;
  }>,
  nomeCondominio: (id: number) => string,
  formatarData: (iso: string) => string,
) {
  return itens.map((item) => [
    nomeCondominio(item.condominioId),
    item.bloco ? `${item.identificacao} · ${item.bloco}` : item.identificacao,
    item.valorInadimplencia ?? "—",
    item.diasAtrasoMax > 0 ? String(item.diasAtrasoMax) : "0",
    item.situacao,
    item.codigoRe ?? "—",
    item.ultimoAtendimento ? formatarData(item.ultimoAtendimento) : "—",
    item.proximoRetorno ? formatarData(item.proximoRetorno) : "—",
    item.retornoSituacao || "—",
  ]);
}

export const colunasFilaExport = [
  "Condomínio",
  "Unidade",
  "Inadimplência",
  "Dias atraso (máx.)",
  "Situação",
  "RE responsável",
  "Último atendimento",
  "Próximo retorno",
  "Retorno",
];

export const colunasRetornosExport = [
  "Previsto",
  "Situação",
  "Condomínio",
  "Unidade",
  "RE",
  "Data atendimento",
  "Autor atendimento",
  "Próxima ação",
  "Observação",
  "Conclusão",
  "Concluído por",
];

export function linhasRetornosExport(
  itens: Array<{
    dataPrevista: string;
    situacaoAgenda: string;
    condominioNome: string;
    unidadeLabel: string;
    codigoRe: string | null;
    dataHoraAtendimento: string;
    atendimentoAutorNome: string;
    proximaAcao: string;
    observacao: string;
    retornoConcluidoEm: string | null;
    retornoConcluidoPorNome: string | null;
  }>,
  formatarData: (iso: string) => string,
  rotuloSituacao: Record<string, string>,
) {
  return itens.map((item) => [
    formatarData(item.dataPrevista),
    rotuloSituacao[item.situacaoAgenda] ?? item.situacaoAgenda,
    item.condominioNome,
    item.unidadeLabel,
    item.codigoRe ?? "—",
    formatarData(item.dataHoraAtendimento),
    item.atendimentoAutorNome,
    item.proximaAcao || "—",
    item.observacao || "—",
    item.retornoConcluidoEm ? formatarData(item.retornoConcluidoEm) : "—",
    item.retornoConcluidoPorNome ?? "—",
  ]);
}
