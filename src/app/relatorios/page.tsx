"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, CalendarClock, Handshake, ArrowUpRight, Phone, Users, Wallet } from "lucide-react";
import {
  GraficoBarras,
  GraficoCalor,
  GraficoColunas,
  GraficoEmpilhado,
  GraficoLinha,
  GraficoRosca,
  tomPorIndice,
} from "@/components/charts";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { type PeriodPreset, resolverPeriodo } from "@/components/period-input";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow, TableExport, type TableExportFormat, type TableSortDirection } from "@/components/table";
import { useToast } from "@/components/toast";
import {
  Grade,
  Leitura,
  RelatorioFiltros,
  RelatorioMetrica,
  RelatorioPainel,
  RelatorioSecaoTabela,
  VoltarRelatoriosHub,
} from "@/components/relatorios/relatorio-ui";
import { WorkspaceShell } from "@/components/workspace-shell";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  acimaDoLimite,
  canaisAtendimento,
  debitoAbertoNaData,
  diasDeAtraso,
  escopoCondominios,
  faixasAtraso,
  formatarData,
  opcoesAdvogadosResponsaveis,
  grupoDebito,
  gruposDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  motivosPendencia,
  nomeUnidade,
  situacaoRetorno,
  type Atendimento,
  type Condominio,
  type Debito,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { listarAtendimentos } from "@/lib/atendimentos/service";
import { codigoReDoUsuario, listarAtendentesComRe } from "@/lib/colaboradores/re";
import { listarDebitos } from "@/lib/debitos/service";
import { exportarPdf } from "@/lib/exportar";
import type { RelatorioExportPayload } from "@/lib/relatorios/service";

const filtroInicial = {
  busca: "",
  preset: "7" as PeriodPreset,
  de: "",
  ate: "",
  advogado: "todos",
  condominio: "todos",
  codigoRe: "todos",
  respondeu: "todos",
  motivo: "todos",
  canal: "todos",
};

const rotuloRetorno = { atrasado: "Atrasado", hoje: "Hoje", semana: "Próximos 7 dias", agendado: "Agendado" } as const;

const RELATORIOS = [
  {
    id: "produtividade",
    titulo: "Produtividade por RE",
    descricao: "Indicadores objetivos por colaborador (RE): atendimentos, retornos e carteira no período.",
    icon: Users,
    selo: "Gestão",
  },
  {
    id: "equipe",
    titulo: "Produtividade da equipe",
    descricao: "Volume, resposta, motivos e comparativos — o relatório da palitagem para a administradora.",
    icon: Phone,
    selo: "Operação",
  },
  {
    id: "retornos",
    titulo: "Retornos pendentes",
    descricao: "Atrasados, de hoje e da semana, por atendente e condomínio.",
    icon: CalendarClock,
    selo: "Agenda",
  },
  {
    id: "efetividade",
    titulo: "Efetividade da cobrança",
    descricao: "Unidades contatadas que pagaram ou fizeram acordo no mês seguinte.",
    icon: Handshake,
    selo: "Resultado",
  },
  {
    id: "carteira",
    titulo: "Carteira e unidades",
    descricao: "Inadimplência da carteira, ranking, alertas e estatística unidade a unidade (contato x débito).",
    icon: Wallet,
    selo: "Carteira",
  },
] as const;

type RelatorioId = (typeof RELATORIOS)[number]["id"];

function ehRelatorio(valor: string | null): valor is RelatorioId {
  return RELATORIOS.some((item) => item.id === valor);
}

function resolverRelatorio(abaLegado: string | null, relatorioPedido: string | null): RelatorioId | null {
  if (relatorioPedido === "unidades") return "carteira";
  if (relatorioPedido && ehRelatorio(relatorioPedido)) return relatorioPedido;
  if (abaLegado === "cobranca") return "equipe";
  if (abaLegado === "inadimplencia") return "carteira";
  return null;
}

const COMPARATIVOS = [
  { id: "condominio" as const, rotulo: "Condomínio" },
  { id: "atendente" as const, rotulo: "RE" },
  { id: "advogado" as const, rotulo: "Advogado" },
  { id: "meio" as const, rotulo: "Meio" },
];

function dentro(data: string, inicio: string, fim: string) {
  const dia = data.slice(0, 10);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}

function instanteAtendimento(dataHora: string) {
  const bruto = dataHora.trim();
  const normalizado = bruto.includes("T") ? bruto : bruto.replace(" ", "T");
  const data = new Date(normalizado);
  return Number.isNaN(data.getTime()) ? null : data;
}

function periodoLongo(inicio: string, fim: string) {
  if (!inicio || !fim) return false;
  const a = new Date(`${inicio}T00:00:00`);
  const b = new Date(`${fim}T00:00:00`);
  return (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) > 2;
}

function mesSeguinte(iso: string) {
  const data = new Date(`${iso.slice(0, 7)}-01T00:00:00`);
  data.setMonth(data.getMonth() + 1);
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}`;
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function diaCurto(iso: string) {
  const texto = formatarData(iso.slice(0, 10));
  return texto === "—" ? iso : texto.slice(0, 5);
}

function mesCurto(iso: string) {
  return `${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

function somar(itens: Array<{ valorAtualizado: string }>) {
  return itens.reduce((total, item) => total + (Number(item.valorAtualizado) || 0), 0);
}

function agruparContagem(chaves: string[]) {
  const mapa = new Map<string, number>();
  for (const chave of chaves) mapa.set(chave || "—", (mapa.get(chave || "—") ?? 0) + 1);
  const total = chaves.length;
  return [...mapa.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade, percentual: total ? (quantidade / total) * 100 : 0 }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
}

function isoData(data: Date) {
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function cruzou60NoMes(vencimento: string, dataBase: string) {
  const marco = new Date(`${vencimento}T00:00:00`);
  marco.setDate(marco.getDate() + LIMITE_AMIGAVEL_DIAS);
  return isoData(marco).slice(0, 7) === dataBase.slice(0, 7);
}

function valorOrdenavel(texto: string) {
  const bruto = texto.trim();
  if (!bruto || bruto === "—") return null;
  const moeda = bruto.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", ".");
  const numero = Number(moeda);
  if (!Number.isNaN(numero) && /[\d]/.test(bruto)) return numero;
  const data = bruto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (data) return Number(`${data[3]}${data[2]}${data[1]}`);
  return null;
}

function TabelaTexto({
  rotulo,
  colunas,
  linhas,
  pagina,
  onPagina,
  vazio,
}: {
  rotulo: string;
  colunas: string[];
  linhas: string[][];
  pagina: number;
  onPagina: (pagina: number) => void;
  vazio: ReactNode;
}) {
  const [colunaOrdenada, setColunaOrdenada] = useState<number | null>(null);
  const [direcao, setDirecao] = useState<TableSortDirection>("none");

  function direcaoColuna(indice: number): TableSortDirection {
    return colunaOrdenada === indice ? direcao : "none";
  }

  function alternarOrdenacao(indice: number) {
    if (colunaOrdenada !== indice) {
      setColunaOrdenada(indice);
      setDirecao("asc");
      onPagina(1);
      return;
    }
    if (direcao === "asc") {
      setDirecao("desc");
      onPagina(1);
      return;
    }
    if (direcao === "desc") {
      setColunaOrdenada(null);
      setDirecao("none");
      onPagina(1);
      return;
    }
    setDirecao("asc");
    onPagina(1);
  }

  const linhasOrdenadas = useMemo(() => {
    if (colunaOrdenada === null || direcao === "none") return linhas;
    return [...linhas].sort((a, b) => {
      const va = a[colunaOrdenada] ?? "";
      const vb = b[colunaOrdenada] ?? "";
      const na = valorOrdenavel(va);
      const nb = valorOrdenavel(vb);
      const cmp =
        na !== null && nb !== null
          ? na - nb
          : va.localeCompare(vb, "pt-BR", { numeric: true, sensitivity: "base" });
      return direcao === "asc" ? cmp : -cmp;
    });
  }, [colunaOrdenada, direcao, linhas]);

  const recorte = linhasOrdenadas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  return (
    <RelatorioSecaoTabela titulo={rotulo}>
      <Table showExport={false} aria-label={rotulo}>
        <TableHeader>
          <TableRow className="border-border-subtle/50 hover:bg-transparent">
            {colunas.map((coluna, indice) => (
              <TableHead key={coluna} sortable sortDirection={direcaoColuna(indice)} onSort={() => alternarOrdenacao(indice)}>
                {coluna}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhasOrdenadas.length === 0 ? (
            <TableEmpty colSpan={colunas.length}>{vazio}</TableEmpty>
          ) : (
            recorte.map((linha, indice) => (
              <TableRow key={`${linha.join("-")}-${indice}`}>
                {linha.map((celula, coluna) => (
                  <TableCell key={`${colunas[coluna]}-${celula}`} className={coluna === 0 ? "font-medium" : "tabular-nums"}>
                    {celula}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {linhasOrdenadas.length > PAGE_SIZE ? <Pagination page={pagina} total={linhasOrdenadas.length} onPageChange={onPagina} /> : null}
    </RelatorioSecaoTabela>
  );
}

function reDoUsuarioId(cadastros: ReturnType<typeof useCadastros>, usuarioId: number) {
  const usuario = cadastros.usuarios.find((item) => item.id === usuarioId);
  if (!usuario) return "—";
  return codigoReDoUsuario(usuario) ?? "—";
}

function RelatoriosPage() {
  const { toast } = useToast();
  const { pode } = usePermissao();
  const { user: sessao } = useAuth();
  const userId = sessao?.userId ?? 0;
  const router = useRouter();
  const params = useSearchParams();
  const pedidoRelatorio = params?.get("relatorio") ?? null;
  const pedidoAba = params?.get("aba") ?? null;
  const relatorioBruto = resolverRelatorio(pedidoAba, pedidoRelatorio);
  const relatorio = relatorioBruto === "produtividade" ? null : relatorioBruto;
  const atual = relatorio ? RELATORIOS.find((item) => item.id === relatorio)! : null;

  useEffect(() => {
    if (pedidoRelatorio !== "produtividade") return;
    const qs = new URLSearchParams();
    if (params) {
      for (const [chave, valor] of params.entries()) {
        if (chave !== "relatorio" && chave !== "aba") qs.set(chave, valor);
      }
    }
    const sufixo = qs.toString();
    router.replace(sufixo ? `/relatorios/produtividade?${sufixo}` : "/relatorios/produtividade");
  }, [pedidoRelatorio, params, router]);

  useEffect(() => {
    const condominioParam = params?.get("condominio")?.trim();
    if (!relatorio || !condominioParam || condominioParam === "todos") return;
    if (!Number.isFinite(Number(condominioParam))) return;
    setFiltro((atual) => (atual.condominio === condominioParam ? atual : { ...atual, condominio: condominioParam }));
    setAplicado((atual) => (atual.condominio === condominioParam ? atual : { ...atual, condominio: condominioParam }));
  }, [relatorio, params]);
  const cadastros = useCadastros();
  const [filtro, setFiltro] = useState(filtroInicial);
  const [aplicado, setAplicado] = useState(filtroInicial);
  const [pagina, setPagina] = useState(1);
  const [comparativo, setComparativo] = useState<(typeof COMPARATIVOS)[number]["id"]>("condominio");
  const hoje = hojeIso();
  const periodo = resolverPeriodo(aplicado, hoje);
  const dataBase = periodo.fim || hoje;
  const busca = aplicado.busca.trim().toLocaleLowerCase("pt-BR");
  const chave = `${relatorio ?? "hub"}|${periodo.inicio}|${periodo.fim}|${aplicado.advogado}|${aplicado.condominio}|${aplicado.codigoRe}|${aplicado.respondeu}|${aplicado.motivo}|${aplicado.canal}|${busca}|${comparativo}`;

  const condominiosEscopo = escopoCondominios(cadastros, userId || undefined);
  const atendentesRe = listarAtendentesComRe();
  const podeFiltrarPorRe = pode("usuarios", "criar");
  const relatoriosHub = RELATORIOS.filter((item) => item.id !== "produtividade" || podeFiltrarPorRe);

  function filtrosRelatorioServico() {
    const condominioId =
      aplicado.condominio !== "todos" && Number.isFinite(Number(aplicado.condominio))
        ? Number(aplicado.condominio)
        : null;
    return {
      busca: aplicado.busca,
      de: periodo.inicio,
      ate: periodo.fim,
      advogado: aplicado.advogado,
      condominioId,
      codigoRe: aplicado.codigoRe,
      respondeu: aplicado.respondeu,
      motivo: aplicado.motivo,
      canal: aplicado.canal,
      dataBase,
    };
  }

  function queryExportParams() {
    const qs = new URLSearchParams();
    if (relatorio) qs.set("tipo", relatorio);
    if (aplicado.busca.trim()) qs.set("busca", aplicado.busca.trim());
    if (relatorio === "carteira") {
      qs.set("dataBase", dataBase);
    } else {
      if (periodo.inicio) qs.set("de", periodo.inicio);
      if (periodo.fim) qs.set("ate", periodo.fim);
    }
    if (aplicado.advogado !== "todos") qs.set("advogado", aplicado.advogado);
    if (aplicado.condominio !== "todos") qs.set("condominio", aplicado.condominio);
    if (aplicado.codigoRe !== "todos") qs.set("codigoRe", aplicado.codigoRe);
    if (aplicado.respondeu !== "todos") qs.set("respondeu", aplicado.respondeu);
    if (aplicado.motivo !== "todos") qs.set("motivo", aplicado.motivo);
    if (aplicado.canal !== "todos") qs.set("canal", aplicado.canal);
    return qs;
  }

  async function exportarViaApi(formato: "csv" | "xls") {
    if (!relatorio) return;
    const qs = queryExportParams();
    qs.set("formato", formato);
    try {
      const response = await fetch(`/api/relatorios/export?${qs.toString()}`, { credentials: "same-origin" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast({
          variant: "error",
          title: "Exportação não concluída",
          description: body.error ?? "Verifique os filtros e tente novamente.",
        });
        return;
      }
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const nome = match?.[1] ?? `relatorio.${formato === "csv" ? "csv" : "xls"}`;
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = nome;
      link.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: formato === "csv" ? "CSV baixado" : "Planilha baixada" });
    } catch {
      toast({
        variant: "error",
        title: "Falha na exportação",
        description: "Não foi possível comunicar com o servidor.",
      });
    }
  }

  function abrirRelatorio(id: RelatorioId) {
    setPagina(1);
    if (id === "produtividade") {
      router.push("/relatorios/produtividade");
      return;
    }
    router.push(`/relatorios?relatorio=${id}`);
  }

  async function aoExportar(formato: TableExportFormat) {
    if (formato === "pdf") {
      await imprimir();
      return;
    }
    await exportarViaApi(formato === "csv" ? "csv" : "xls");
  }

  function condominioDaUnidade(unidadeId: string) {
    const unidade = cadastros.unidades.find((item) => String(item.id) === String(unidadeId));
    if (!unidade) return undefined;
    return cadastros.condominios.find((item) => item.id === unidade.condominioId);
  }

  function combinaCarteira(condominio: Condominio | undefined) {
    if (!condominio) return false;
    if (aplicado.advogado !== "todos" && !condominio.advogados.includes(aplicado.advogado)) return false;
    if (aplicado.condominio !== "todos" && String(condominio.id) !== aplicado.condominio) return false;
    return true;
  }

  function combinaAtendimento(item: Atendimento, exigirPeriodo: boolean) {
    if (exigirPeriodo && !dentro(item.dataHora, periodo.inicio, periodo.fim)) return false;
    const condominio = condominioDaUnidade(item.unidadeId);
    if (!combinaCarteira(condominio)) return false;
    if (aplicado.codigoRe !== "todos") {
      const re = reDoUsuarioId(cadastros, item.usuarioId);
      if (re.toUpperCase() !== aplicado.codigoRe.toUpperCase()) return false;
    }
    if (aplicado.respondeu !== "todos" && item.respondeu !== aplicado.respondeu) return false;
    if (aplicado.motivo !== "todos" && item.motivo !== aplicado.motivo) return false;
    if (aplicado.canal !== "todos" && item.canal !== aplicado.canal) return false;
    const texto = `${item.assunto} ${item.descricao} ${item.motivo} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase("pt-BR");
    return busca.length === 0 || texto.includes(busca);
  }

  const atendimentosBase = userId ? listarAtendimentos(userId) : [];
  const atendimentos = atendimentosBase.filter((item) => combinaAtendimento(item, true));
  const responderam = atendimentos.filter((item) => item.respondeu === "Sim").length;
  const unidadesContatadas = new Set(atendimentos.map((item) => item.unidadeId)).size;
  const retornosPeriodo = atendimentos.filter((item) => item.status !== "Resolvido" && item.dataProximaAcao);
  const taxaResposta = atendimentos.length ? (responderam / atendimentos.length) * 100 : 0;
  const serieLonga = periodoLongo(periodo.inicio, periodo.fim);
  const serieMapa = new Map<string, number>();
  for (const item of atendimentos) {
    const dia = serieLonga ? item.dataHora.slice(0, 7) : item.dataHora.slice(0, 10);
    serieMapa.set(dia, (serieMapa.get(dia) ?? 0) + 1);
  }
  let serie = [...serieMapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, quantidade]) => ({
      nome: serieLonga ? mesCurto(dia) : diaCurto(dia),
      quantidade,
    }));
  let pico = [...serie].sort((a, b) => b.quantidade - a.quantidade)[0];

  const porCondominio = agruparContagem(atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.nome ?? "—"));
  let porAtendente = agruparContagem(atendimentos.map((item) => reDoUsuarioId(cadastros, item.usuarioId)));
  let porAdvogado = agruparContagem(
    atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.advogados[0] ?? "—"),
  );
  const porMeio = agruparContagem(atendimentos.map((item) => item.canal || "—"));
  let porMotivo = agruparContagem(atendimentos.filter((item) => item.respondeu === "Sim").map((item) => item.motivo || "Não informou o motivo"));
  let respondeuGrupo = agruparContagem(atendimentos.map((item) => (item.respondeu === "Sim" || item.respondeu === "Não" ? item.respondeu : "—")));
  let meios = porMeio.map((linha) => {
    const itens = atendimentos.filter((item) => (item.canal || "—") === linha.nome);
    const sim = itens.filter((item) => item.respondeu === "Sim").length;
    return { ...linha, resposta: itens.length ? (sim / itens.length) * 100 : 0 };
  });

  let resumoCondominio = porCondominio.map((linha) => {
    const doCondominio = atendimentos.filter((item) => (condominioDaUnidade(item.unidadeId)?.nome ?? "—") === linha.nome);
    const comResposta = doCondominio.filter((item) => item.respondeu === "Sim").length;
    const ultimo = [...doCondominio].sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
    return {
      nome: linha.nome,
      quantidade: linha.quantidade,
      resposta: doCondominio.length ? (comResposta / doCondominio.length) * 100 : 0,
      unidades: new Set(doCondominio.map((item) => item.unidadeId)).size,
      ultimo: ultimo ? formatarData(ultimo.dataHora) : "—",
    };
  });

  let equipe = porAtendente.map((linha) => {
    const itens = atendimentos.filter((item) => reDoUsuarioId(cadastros, item.usuarioId) === linha.nome);
    const sim = itens.filter((item) => item.respondeu === "Sim").length;
    const atrasados = itens.filter((item) => item.status !== "Resolvido" && situacaoRetorno(item.dataProximaAcao) === "atrasado").length;
    return {
      nome: linha.nome,
      quantidade: linha.quantidade,
      resposta: itens.length ? (sim / itens.length) * 100 : 0,
      unidades: new Set(itens.map((item) => item.unidadeId)).size,
      atrasados,
    };
  });

  const retornos = atendimentosBase
    .filter((item) => {
      if (!combinaAtendimento(item, false)) return false;
      if (item.status === "Resolvido" || !item.dataProximaAcao) return false;
      const situacao = situacaoRetorno(item.dataProximaAcao);
      if (situacao === "atrasado") return true;
      if (!periodo.inicio && !periodo.fim) return true;
      return dentro(item.dataProximaAcao, periodo.inicio, periodo.fim) || situacao === "hoje" || situacao === "semana";
    })
    .sort((a, b) => a.dataProximaAcao.localeCompare(b.dataProximaAcao));
  const retornosAtrasados = retornos.filter((item) => situacaoRetorno(item.dataProximaAcao) === "atrasado").length;
  const retornosHoje = retornos.filter((item) => situacaoRetorno(item.dataProximaAcao) === "hoje").length;

  const debitosEscopoLista = userId ? listarDebitos(userId) : [];
  let cruzamento = [...new Set(atendimentos.map((item) => item.unidadeId))].map((unidadeId) => {
    const contatos = atendimentos.filter((item) => item.unidadeId === unidadeId);
    const meses = new Set(contatos.map((item) => mesSeguinte(item.dataHora)));
    const pagamento = debitosEscopoLista.find(
      (debito) => String(debito.unidadeId) === unidadeId && debito.status === "Pago" && debito.dataPagamento && meses.has(debito.dataPagamento.slice(0, 7)),
    );
    const acordo = debitosEscopoLista.find(
      (debito) => String(debito.unidadeId) === unidadeId && grupoDebito(debito.descricao) === "Acordo" && meses.has(debito.dataVencimento.slice(0, 7)),
    );
    return {
      unidade: nomeUnidade(unidadeId),
      condominio: condominioDaUnidade(unidadeId)?.nome ?? "—",
      contatos: contatos.length,
      resultado: pagamento ? "Pagou no mês seguinte" : acordo ? "Acordo no mês seguinte" : "Sem resultado no mês seguinte",
    };
  });
  let comResultado = cruzamento.filter((linha) => linha.resultado !== "Sem resultado no mês seguinte").length;

  const debitos = (userId ? listarDebitos(userId) : []).filter((item) => {
    const condominio = cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId);
    if (!combinaCarteira(condominio)) return false;
    if (!debitoAbertoNaData(item, dataBase)) return false;
    const texto = `${item.descricao} ${item.referencia} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase("pt-BR");
    return busca.length === 0 || texto.includes(busca);
  });
  const totalAberto = somar(debitos);
  const totalOriginal = debitos.reduce((total, item) => total + (Number(item.valorOriginal) || 0), 0);
  const ate60 = debitos.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
  const acima60 = debitos.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
  const valorAte60 = somar(ate60);
  const valorAcima60 = somar(acima60);
  const unidadesDevedoras = new Set(debitos.map((item) => item.unidadeId)).size;
  const unidadesCarteira = cadastros.unidades.filter((item) =>
    combinaCarteira(cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId)),
  ).length;
  const percentualUnidades = unidadesCarteira ? (unidadesDevedoras / unidadesCarteira) * 100 : 0;
  const parteJuridica = totalAberto ? (valorAcima60 / totalAberto) * 100 : 0;

  const rankingCondominio = [...new Set(debitos.map((item) => item.condominioId))]
    .map((id) => {
      const itens = debitos.filter((item) => item.condominioId === id);
      const unidadesCondo = cadastros.unidades.filter((item) => item.condominioId === id).length;
      const devedoras = new Set(itens.map((item) => item.unidadeId)).size;
      return {
        nome: cadastros.condominios.find((item) => item.id === id)?.nome ?? "—",
        valor: somar(itens),
        ate: somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        acima: somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        devedoras,
        unidades: unidadesCondo,
        percentualValor: totalAberto ? (somar(itens) / totalAberto) * 100 : 0,
        percentualUnidades: unidadesCondo ? (devedoras / unidadesCondo) * 100 : 0,
      };
    })
    .sort((a, b) => b.valor - a.valor);

  const advogadosEscopo = [
    ...new Set(condominiosEscopo.flatMap((item) => item.advogados)),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const porAdvogadoDebito = (advogadosEscopo.length ? advogadosEscopo : opcoesAdvogadosResponsaveis(cadastros))
    .map((advogado) => {
      const itens = debitos.filter((item) => {
        const condominio = cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId);
        return condominio ? condominio.advogados.includes(advogado) : false;
      });
      return {
        nome: advogado,
        valor: somar(itens),
        ate: somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        acima: somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        unidades: new Set(itens.map((item) => item.unidadeId)).size,
      };
    })
    .filter((linha) => linha.valor > 0)
    .sort((a, b) => b.valor - a.valor);

  const porGrupo = gruposDebito.map((grupo) => {
    const itens = debitos.filter((item) => grupoDebito(item.descricao) === grupo);
    const valor = somar(itens);
    return {
      nome: grupo,
      valor,
      ate: somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
      acima: somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
      percentual: totalAberto ? (valor / totalAberto) * 100 : 0,
    };
  });
  const grupoLider = [...porGrupo].sort((a, b) => b.valor - a.valor)[0];

  const porFaixa = faixasAtraso.map((faixa) => {
    const itens = debitos.filter((item) => {
      const dias = diasDeAtraso(item.dataVencimento, dataBase);
      return dias >= faixa.min && dias <= faixa.max;
    });
    const valor = somar(itens);
    return { nome: faixa.label, valor, percentual: totalAberto ? (valor / totalAberto) * 100 : 0 };
  });
  const faixaLider = [...porFaixa].sort((a, b) => b.valor - a.valor)[0];

  const maiores = [...new Set(debitos.map((item) => item.unidadeId))]
    .map((unidadeId) => {
      const itens = debitos.filter((item) => item.unidadeId === unidadeId);
      const dias = Math.max(...itens.map((item) => diasDeAtraso(item.dataVencimento, dataBase)));
      return {
        unidade: nomeUnidade(unidadeId),
        condominio: cadastros.condominios.find((item) => item.id === itens[0]?.condominioId)?.nome ?? "—",
        valor: somar(itens),
        dias,
        grupo: grupoDebito(itens.sort((a, b) => Number(b.valorAtualizado) - Number(a.valorAtualizado))[0]?.descricao ?? ""),
      };
    })
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const prescricao = debitos.filter((item) => diasDeAtraso(item.dataVencimento, dataBase) >= 1643);
  const acordosQuebrados = debitos.filter((item) => grupoDebito(item.descricao) === "Acordo" && diasDeAtraso(item.dataVencimento, dataBase) > 0);
  const passaram60 = debitos.filter((item) => cruzou60NoMes(item.dataVencimento, dataBase));
  const alertas = [
    ...prescricao.map((item) => ({ tipo: "Perto de 5 anos", item })),
    ...acordosQuebrados.map((item) => ({ tipo: "Acordo descumprido", item })),
    ...passaram60.map((item) => ({ tipo: "Passou de 60 dias no mês", item })),
  ];

  const listaAtendimentos = [...atendimentos].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  const listaDebitos = [...debitos].sort((a, b) => Number(b.valorAtualizado) - Number(a.valorAtualizado));

  const idsUnidadeRecorte = new Set([...atendimentos.map((item) => item.unidadeId), ...debitos.map((item) => item.unidadeId)]);
  let statsPorUnidade = [...idsUnidadeRecorte]
    .map((unidadeId) => {
      const contatos = atendimentos.filter((item) => item.unidadeId === unidadeId);
      const respostas = contatos.filter((item) => item.respondeu === "Sim").length;
      const cobrancas = debitos.filter((item) => item.unidadeId === unidadeId);
      const valorAberto = somar(cobrancas);
      const dias =
        cobrancas.length > 0 ? Math.max(...cobrancas.map((item) => diasDeAtraso(item.dataVencimento, dataBase))) : 0;
      const ultimo = [...contatos].sort((a, b) => b.dataHora.localeCompare(a.dataHora))[0];
      return {
        unidadeId,
        nome: nomeUnidade(String(unidadeId)),
        condominio: condominioDaUnidade(String(unidadeId))?.nome ?? "—",
        contatos: contatos.length,
        resposta: contatos.length ? (respostas / contatos.length) * 100 : 0,
        valorAberto,
        dias,
        cobrancas: cobrancas.length,
        ultimo: ultimo ? formatarData(ultimo.dataHora) : "—",
      };
    })
    .sort((a, b) => b.valorAberto - a.valorAberto || b.contatos - a.contatos || a.nome.localeCompare(b.nome, "pt-BR"));

  const evolucaoReferencia = [...new Set(debitos.map((item) => item.referencia || "—"))]
    .map((referencia) => {
      const valor = somar(debitos.filter((item) => (item.referencia || "—") === referencia));
      return { nome: referencia, valor, rotulo: dinheiro(valor) };
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

  const vazio = <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Nenhum registro no recorte" description="Ajuste o período ou os filtros." />;
  const vazioCalor = (
    <EmptyState
      icon={<Icon icon={BarChart3} size="lg" />}
      title="Sem horários no recorte"
      description="Não há atendimentos entre 7h e 19h no período filtrado."
    />
  );

  async function imprimir() {
    if (!relatorio || !atual) return;
    const qs = queryExportParams();
    qs.set("formato", "json");
    try {
      const response = await fetch(`/api/relatorios/export?${qs.toString()}`, { credentials: "same-origin" });
      const body = (await response.json()) as { payload?: RelatorioExportPayload; error?: string };
      if (!response.ok || !body.payload) {
        toast({
          variant: "error",
          title: "Exportação não concluída",
          description: body.error ?? "Verifique os filtros e tente novamente.",
        });
        return;
      }
      const meta = {
        titulo: "Informações da exportação",
        colunas: ["Detalhe"],
        linhas: [[`Gerado em: ${body.payload.meta.geradoEm}`], ...body.payload.meta.filtros.map((linha) => [linha])],
      };
      const secoes = [meta, ...body.payload.secoes.map((secao) => ({ titulo: secao.titulo, colunas: secao.colunas, linhas: secao.linhas }))];
      const abriu = exportarPdf(body.payload.titulo, `${relatorio}.html`, secoes);
      if (!abriu) {
        toast({ variant: "info", title: "Relatório baixado", description: "Abra o arquivo e use imprimir para salvar em PDF." });
      }
    } catch {
      toast({
        variant: "error",
        title: "Falha na exportação",
        description: "Não foi possível comunicar com o servidor.",
      });
    }
  }

  const camposBase = [
    {
      id: "periodo",
      label: relatorio === "carteira" ? "Data-base" : "Período",
      type: "period" as const,
      value: { preset: filtro.preset, de: filtro.de, ate: filtro.ate },
      onChange: (periodoAtual: { preset: PeriodPreset; de: string; ate: string }) => setFiltro((atualFiltro) => ({ ...atualFiltro, ...periodoAtual })),
    },
    {
      id: "advogado",
      label: "Advogado",
      value: filtro.advogado,
      onChange: (advogado: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, advogado })),
      options: [
        { value: "todos", label: "Todos" },
        ...(advogadosEscopo.length ? advogadosEscopo : opcoesAdvogadosResponsaveis(cadastros)).map((item) => ({
          value: item,
          label: item,
        })),
      ],
    },
    {
      id: "condominio",
      label: "Condomínio",
      value: filtro.condominio,
      onChange: (condominio: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, condominio })),
      options: [{ value: "todos", label: "Todos" }, ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome }))],
    },
  ];

  const camposCobranca = [
    ...camposBase,
    ...(podeFiltrarPorRe
      ? [
          {
            id: "codigoRe",
            label: "RE",
            value: filtro.codigoRe,
            onChange: (codigoRe: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, codigoRe })),
            options: [{ value: "todos", label: "Todos" }, ...atendentesRe.map((item) => ({ value: item.codigoRe, label: item.codigoRe }))],
          },
        ]
      : []),
    {
      id: "respondeu",
      label: "Respondeu",
      value: filtro.respondeu,
      onChange: (respondeu: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, respondeu })),
      options: [
        { value: "todos", label: "Todos" },
        { value: "Sim", label: "Sim" },
        { value: "Não", label: "Não" },
      ],
    },
    {
      id: "motivo",
      label: "Motivo",
      value: filtro.motivo,
      onChange: (motivo: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, motivo })),
      options: [{ value: "todos", label: "Todos" }, ...motivosPendencia.map((item) => ({ value: item, label: item }))],
    },
    {
      id: "meio",
      label: "Meio",
      value: filtro.canal,
      onChange: (canal: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, canal })),
      options: [{ value: "todos", label: "Todos" }, ...canaisAtendimento.map((item) => ({ value: item, label: item }))],
    },
  ];

  const camposFiltro = relatorio === "carteira" ? camposBase : camposCobranca;

  const metricAtendimentos = atendimentos.length;
  const metricTaxaResposta = taxaResposta;
  const metricUnidadesContatadas = unidadesContatadas;
  const metricRetornosAbertos = retornosPeriodo.length;
  const metricRetornosAtrasados = retornosAtrasados;
  const metricRetornosHoje = retornosHoje;
  const metricRetornosAgenda = retornos.length;
  const linhasRetornosTabela = retornos.map((item) => [
    formatarData(item.dataProximaAcao),
    condominioDaUnidade(item.unidadeId)?.nome ?? "—",
    nomeUnidade(item.unidadeId),
    reDoUsuarioId(cadastros, item.usuarioId),
    item.proximaAcao || "—",
    rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"],
  ]);

  const linhasAtendimentosDetalhe = listaAtendimentos.map((item) => [
    formatarData(item.dataHora),
    condominioDaUnidade(item.unidadeId)?.nome ?? "—",
    nomeUnidade(item.unidadeId),
    reDoUsuarioId(cadastros, item.usuarioId),
    item.canal,
    item.respondeu || "—",
    item.motivo || "—",
  ]);

  const comparativoBarras =
    comparativo === "condominio"
      ? resumoCondominio.map((linha) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${percentual(linha.resposta)} resposta · ${linha.unidades} un.` }))
      : comparativo === "atendente"
        ? equipe.map((linha) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${percentual(linha.resposta)} resposta` }))
        : comparativo === "advogado"
          ? porAdvogado.map((linha, indice) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`, tom: tomPorIndice(indice) }))
          : meios.map((linha) => ({
              nome: linha.nome,
              valor: linha.quantidade,
              detalhe: `${percentual(linha.resposta)} resposta`,
              tom: linha.resposta >= 50 ? ("settled" as const) : ("pending" as const),
            }));

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const horasCalor = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19];
  const mapaCalor = new Map<string, number>();
  for (const item of atendimentos) {
    const data = instanteAtendimento(item.dataHora);
    if (!data) continue;
    const hora = data.getHours();
    if (hora < horasCalor[0] || hora > horasCalor[horasCalor.length - 1]) continue;
    const chaveCalor = `${data.getDay()}-${hora}`;
    mapaCalor.set(chaveCalor, (mapaCalor.get(chaveCalor) ?? 0) + 1);
  }
  const celulasCalor: Array<{ x: number; y: number; v: number }> = [];
  for (let dia = 0; dia < diasSemana.length; dia += 1) {
    for (const hora of horasCalor) {
      celulasCalor.push({ x: hora, y: dia, v: mapaCalor.get(`${dia}-${hora}`) ?? 0 });
    }
  }
  const picoCalor = [...celulasCalor].sort((a, b) => b.v - a.v)[0];
  const celulasCalorExibir = celulasCalor;
  const picoCalorExibir = picoCalor;

  let corpo: ReactNode = null;
  if (relatorio === "equipe") {
    corpo = (
      <>
        {atendimentos.length > 0 ? (
          <Leitura>
            {pico ? `No período, o pico foi ${pico.nome} (${pico.quantidade} atendimento${pico.quantidade === 1 ? "" : "s"}). ` : ""}
            {percentual(metricTaxaResposta)} dos contatos tiveram resposta.
            {cruzamento.length > 0
              ? ` ${comResultado} de ${cruzamento.length} unidade${cruzamento.length === 1 ? "" : "s"} contatada${cruzamento.length === 1 ? "" : "s"} pagou ou fez acordo no mês seguinte.`
              : ""}
            {metricRetornosAtrasados > 0 ? ` Há ${metricRetornosAtrasados} retorno${metricRetornosAtrasados === 1 ? "" : "s"} atrasado${metricRetornosAtrasados === 1 ? "" : "s"}.` : ""}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
          <RelatorioMetrica valor={String(metricAtendimentos)} rotulo="atendimentos" destaque />
          <RelatorioMetrica valor={percentual(metricTaxaResposta)} rotulo="responderam" detalhe="Taxa de resposta no período" />
          <RelatorioMetrica valor={String(metricUnidadesContatadas)} rotulo="unidades contatadas" accent="tertiary" />
          <RelatorioMetrica valor={String(metricRetornosAbertos)} rotulo="retornos ainda abertos" detalhe="Agenda em aberto no recorte" />
        </div>
        <RelatorioPainel
          titulo="Mapa de horário de atendimento"
          nota={
            picoCalorExibir && picoCalorExibir.v > 0
              ? `Pico: ${diasSemana[picoCalorExibir.y]} às ${picoCalorExibir.x}h (${picoCalorExibir.v} contato${picoCalorExibir.v === 1 ? "" : "s"}).`
              : "Cada quadrado é um dia da semana e um horário (7h–19h)."
          }
        >
          <GraficoCalor
            chave={`${chave}-calor`}
            dias={diasSemana}
            horas={horasCalor}
            celulas={celulasCalorExibir}
            vazio={vazioCalor}
          />
        </RelatorioPainel>
        <RelatorioPainel titulo={serieLonga ? "Atendimentos por mês" : "Atendimentos por dia"} nota="A coluna dourada é o pico. Acima de dois meses, o gráfico passa a ser mensal.">
          <GraficoColunas
            chave={chave}
            vazio={vazio}
            itens={serie.map((linha) => ({
              nome: linha.nome,
              valor: linha.quantidade,
              rotulo: String(linha.quantidade),
              tom: pico && linha.nome === pico.nome && linha.quantidade === pico.quantidade ? "brass" : "navy",
            }))}
          />
        </RelatorioPainel>
        <Grade>
          <RelatorioPainel titulo="Quem respondeu">
            <GraficoRosca
              chave={`${chave}-resposta`}
              vazio={vazio}
              centro={percentual(metricTaxaResposta)}
              legenda="com resposta"
              fatias={respondeuGrupo.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                tom: linha.nome === "Sim" ? "settled" : linha.nome === "Não" ? "pending" : "mist",
              }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Motivos da pendência" nota="Entram só os contatos em que o condômino respondeu.">
            <GraficoBarras
              chave={`${chave}-motivos`}
              vazio={vazio}
              itens={porMotivo.slice(0, 8).map((linha, indice) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${percentual(linha.percentual)}`,
                tom: tomPorIndice(indice),
              }))}
            />
          </RelatorioPainel>
        </Grade>
        <RelatorioPainel
          titulo="Comparativo de volume"
          nota="Na palitagem os condomínios aparecem juntos; a divisão por advogado vale para a leitura da equipe."
        >
          <div className="mb-md flex flex-wrap gap-sm">
            {COMPARATIVOS.map((item) => (
              <Button key={item.id} size="sm" variant={comparativo === item.id ? "primary" : "outline"} onClick={() => setComparativo(item.id)}>
                {item.rotulo}
              </Button>
            ))}
          </div>
          <GraficoBarras chave={`${chave}-${comparativo}`} vazio={vazio} itens={comparativoBarras} />
        </RelatorioPainel>
        <Grade>
          <RelatorioPainel titulo="Unidades com mais contatos" nota="Top 10 no período — o detalhe unidade a unidade está no relatório Carteira e unidades.">
            <GraficoBarras
              chave={`${chave}-unidades-top`}
              vazio={vazio}
              itens={statsPorUnidade
                .filter((linha) => linha.contatos > 0)
                .slice(0, 10)
                .map((linha, indice) => ({
                  nome: linha.nome,
                  valor: linha.contatos,
                  detalhe: `${linha.contatos} · ${percentual(linha.resposta)} resposta`,
                  tom: tomPorIndice(indice),
                }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Resposta por meio de cobrança">
            <GraficoBarras
              chave={`${chave}-meio-resposta`}
              vazio={vazio}
              itens={meios.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${percentual(linha.resposta)} resposta`,
                tom: linha.resposta >= 50 ? "settled" : "pending",
              }))}
            />
          </RelatorioPainel>
        </Grade>
        <TabelaTexto
          rotulo="Resumo por condomínio"
          colunas={["Condomínio", "Atendimentos", "Resposta", "Unidades", "Último contato"]}
          linhas={resumoCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta), String(linha.unidades), linha.ultimo])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
        <TabelaTexto
          rotulo="Lista detalhada do período"
          colunas={["Data", "Condomínio", "Unidade", "RE", "Meio", "Respondeu", "Motivo"]}
          linhas={linhasAtendimentosDetalhe}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  } else if (relatorio === "retornos") {
    const porSituacao = agruparContagem(retornos.map((item) => rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"]));
    const porAtendenteRetorno = agruparContagem(retornos.map((item) => reDoUsuarioId(cadastros, item.usuarioId)));
    corpo = (
      <>
        {metricRetornosAgenda > 0 ? (
          <Leitura>
            {metricRetornosAtrasados > 0
              ? `${metricRetornosAtrasados} retorno${metricRetornosAtrasados === 1 ? "" : "s"} passou da data combinada. `
              : "Nenhum retorno atrasado no recorte. "}
            Hoje: {metricRetornosHoje}. Na agenda: {metricRetornosAgenda}.
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <RelatorioMetrica valor={String(metricRetornosAtrasados)} rotulo="atrasados" destaque accent="critical" detalhe="Passaram da data combinada" />
          <RelatorioMetrica valor={String(metricRetornosHoje)} rotulo="para hoje" accent="brass" />
          <RelatorioMetrica valor={String(metricRetornosAgenda)} rotulo="na agenda" accent="tertiary" />
        </div>
        <Grade>
          <RelatorioPainel titulo="Situação da agenda">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={String(metricRetornosAgenda)}
              legenda="retornos"
              fatias={porSituacao.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: String(linha.quantidade),
                tom: linha.nome === "Atrasado" ? "critical" : linha.nome === "Hoje" ? "pending" : linha.nome === "Próximos 7 dias" ? "brass" : "navy",
              }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Por RE">
            <GraficoBarras
              chave={`${chave}-equipe`}
              vazio={vazio}
              itens={porAtendenteRetorno.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: String(linha.quantidade),
              }))}
            />
          </RelatorioPainel>
        </Grade>
        <TabelaTexto
          rotulo="Retornos pendentes"
          colunas={["Quando", "Condomínio", "Unidade", "RE", "Próxima ação", "Situação"]}
          linhas={linhasRetornosTabela}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  } else if (relatorio === "efetividade") {
    const gruposResultado = agruparContagem(cruzamento.map((linha) => linha.resultado));
    corpo = (
      <>
        {cruzamento.length > 0 ? (
          <Leitura>
            {comResultado === 0
              ? `Nenhuma das ${cruzamento.length} unidades contatadas pagou ou fez acordo no mês seguinte.`
              : `${comResultado} de ${cruzamento.length} unidades contatadas tiveram pagamento ou acordo no mês seguinte.`}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <RelatorioMetrica valor={String(cruzamento.length)} rotulo="unidades contatadas" />
          <RelatorioMetrica valor={String(cruzamento.filter((linha) => linha.resultado.startsWith("Pagou")).length)} rotulo="pagaram" destaque />
          <RelatorioMetrica valor={String(cruzamento.filter((linha) => linha.resultado.startsWith("Acordo")).length)} rotulo="fizeram acordo" />
        </div>
        <Grade>
          <RelatorioPainel titulo="O que aconteceu no mês seguinte">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={String(comResultado)}
              legenda="com efeito"
              fatias={gruposResultado.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: String(linha.quantidade),
                tom: linha.nome.startsWith("Pagou") ? "settled" : linha.nome.startsWith("Acordo") ? "brass" : "mist",
              }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Contatos por unidade">
            <GraficoBarras
              chave={`${chave}-unidades`}
              vazio={vazio}
              itens={cruzamento.slice(0, 12).map((linha) => ({
                nome: linha.unidade,
                valor: linha.contatos,
                detalhe: linha.resultado,
                tom: linha.resultado.startsWith("Pagou") ? "settled" : linha.resultado.startsWith("Acordo") ? "brass" : "mist",
              }))}
            />
          </RelatorioPainel>
        </Grade>
        <TabelaTexto
          rotulo="Unidades contatadas e resultado"
          colunas={["Unidade", "Condomínio", "Contatos", "Resultado"]}
          linhas={cruzamento.map((linha) => [linha.unidade, linha.condominio, String(linha.contatos), linha.resultado])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  } else if (relatorio === "carteira") {
    const comContato = statsPorUnidade.filter((linha) => linha.contatos > 0).length;
    const maiorDebito = statsPorUnidade[0];
    corpo = (
      <>
        {totalAberto > 0 || statsPorUnidade.length > 0 ? (
          <Leitura>
            {totalAberto > 0 ? (
              <>
                Carteira com {dinheiro(totalAberto)} atualizado em {formatarData(dataBase)} — {percentual(percentualUnidades)} das unidades com débito vencido.
                {grupoLider && grupoLider.valor > 0 ? ` ${grupoLider.nome} responde por ${percentual(grupoLider.percentual)} do total.` : ""}
                {percentual(parteJuridica)} já está acima de {LIMITE_AMIGAVEL_DIAS} dias (fase jurídica).
                {alertas.length > 0 ? ` ${alertas.length} alerta${alertas.length === 1 ? "" : "s"} pedem atenção.` : ""}
              </>
            ) : null}
            {comContato > 0 ? ` ${comContato} unidade${comContato === 1 ? "" : "s"} teve contato da equipe no mesmo recorte de filtros.` : ""}
            {maiorDebito && maiorDebito.valorAberto > 0
              ? ` Maior saldo: ${maiorDebito.nome} (${dinheiro(maiorDebito.valorAberto)}).`
              : ""}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
          <RelatorioMetrica valor={dinheiro(totalAberto)} rotulo="valor atualizado" destaque />
          <RelatorioMetrica valor={dinheiro(valorAte60)} rotulo={`até ${LIMITE_AMIGAVEL_DIAS} dias`} accent="tertiary" detalhe="Fase amigável" />
          <RelatorioMetrica valor={dinheiro(valorAcima60)} rotulo={`acima de ${LIMITE_AMIGAVEL_DIAS} dias`} accent="critical" detalhe="Fase jurídica" />
          <RelatorioMetrica valor={percentual(percentualUnidades)} rotulo="unidades inadimplentes" detalhe="Sobre a carteira filtrada" />
        </div>
        <Grade>
          <RelatorioPainel titulo="Fase amigável e jurídica" nota="Corte configurável em 60 dias — cobrança recente x encaminhamento jurídico.">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={percentual(parteJuridica)}
              legenda="jurídico"
              fatias={[
                { nome: `Até ${LIMITE_AMIGAVEL_DIAS} dias`, valor: valorAte60, detalhe: dinheiro(valorAte60), tom: "brass" },
                { nome: `Acima de ${LIMITE_AMIGAVEL_DIAS} dias`, valor: valorAcima60, detalhe: dinheiro(valorAcima60), tom: "navy" },
              ]}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Composição do débito" nota="Cota ordinária, taxa extra, acordo e multa — como no relatório da administradora.">
            <GraficoRosca
              chave={`${chave}-grupos`}
              vazio={vazio}
              centro={grupoLider && grupoLider.valor > 0 ? percentual(grupoLider.percentual) : "—"}
              legenda="principal"
              fatias={porGrupo
                .filter((linha) => linha.valor > 0)
                .map((linha, indice) => ({
                  nome: linha.nome,
                  valor: linha.valor,
                  detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentual)}`,
                  tom: tomPorIndice(indice),
                }))}
            />
          </RelatorioPainel>
        </Grade>
        <Grade>
          <RelatorioPainel titulo="Faixas de atraso">
            <GraficoColunas
              chave={`${chave}-faixas`}
              vazio={vazio}
              itens={porFaixa.map((linha) => ({
                nome: linha.nome,
                valor: linha.valor,
                rotulo: percentual(linha.percentual),
                tom: faixaLider && linha.nome === faixaLider.nome ? "brass" : "navy",
              }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Ranking de condomínios">
            <GraficoBarras
              chave={`${chave}-ranking`}
              vazio={vazio}
              itens={rankingCondominio.slice(0, 10).map((linha) => ({
                nome: linha.nome,
                valor: linha.valor,
                detalhe: `${dinheiro(linha.valor)} · ${linha.devedoras}/${linha.unidades} un.`,
              }))}
            />
          </RelatorioPainel>
        </Grade>
        <RelatorioPainel titulo="Saldo em aberto por competência" nota="Cada ponto é o mês de referência das cobranças ainda em aberto.">
          <GraficoLinha chave={`${chave}-competencia`} vazio={vazio} itens={evolucaoReferencia} />
        </RelatorioPainel>
        <section className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
          <div className="flex flex-col gap-xs">
            <h2 className="text-headline-sm text-on-surface">Por unidade</h2>
            <p className="text-body-sm text-on-surface-variant">Contatos da equipe no período filtrado cruzados com o débito em aberto na data-base.</p>
          </div>
          <Grade>
            <RelatorioPainel titulo="Mais contatos no período">
              <GraficoBarras
                chave={`${chave}-contatos-unidade`}
                vazio={vazio}
                itens={statsPorUnidade
                  .filter((linha) => linha.contatos > 0)
                  .slice(0, 10)
                  .map((linha, indice) => ({
                    nome: linha.nome,
                    valor: linha.contatos,
                    detalhe: `${percentual(linha.resposta)} resposta`,
                    tom: tomPorIndice(indice),
                  }))}
              />
            </RelatorioPainel>
            <RelatorioPainel titulo="Maior débito">
              <GraficoBarras
                chave={`${chave}-valor-unidade`}
                vazio={vazio}
                itens={statsPorUnidade
                  .filter((linha) => linha.valorAberto > 0)
                  .slice(0, 10)
                  .map((linha, indice) => ({
                    nome: linha.nome,
                    valor: linha.valorAberto,
                    detalhe: `${dinheiro(linha.valorAberto)} · ${linha.dias} dias`,
                    tom: linha.dias > LIMITE_AMIGAVEL_DIAS ? "critical" : tomPorIndice(indice),
                  }))}
              />
            </RelatorioPainel>
          </Grade>
          <Grade>
            <RelatorioPainel titulo="Fase amigável x jurídica por unidade">
              <GraficoEmpilhado
                chave={`${chave}-unidade-fase`}
                vazio={vazio}
                itens={statsPorUnidade
                  .filter((linha) => linha.valorAberto > 0)
                  .slice(0, 8)
                  .map((linha) => {
                    const itens = debitos.filter((item) => item.unidadeId === linha.unidadeId);
                    const ate = somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase))));
                    const acima = somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase))));
                    return { nome: linha.nome, ate, acima, detalhe: dinheiro(linha.valorAberto) };
                  })}
              />
            </RelatorioPainel>
            <RelatorioPainel titulo="Contato e débito">
              <GraficoRosca
                chave={`${chave}-unidade-mix`}
                vazio={vazio}
                centro={String(statsPorUnidade.length)}
                legenda="unidades"
                fatias={[
                  {
                    nome: "Contato e débito",
                    valor: statsPorUnidade.filter((linha) => linha.contatos > 0 && linha.valorAberto > 0).length,
                    detalhe: String(statsPorUnidade.filter((linha) => linha.contatos > 0 && linha.valorAberto > 0).length),
                    tom: "brass",
                  },
                  {
                    nome: "Só contato",
                    valor: statsPorUnidade.filter((linha) => linha.contatos > 0 && linha.valorAberto <= 0).length,
                    detalhe: String(statsPorUnidade.filter((linha) => linha.contatos > 0 && linha.valorAberto <= 0).length),
                    tom: "settled",
                  },
                  {
                    nome: "Só débito",
                    valor: statsPorUnidade.filter((linha) => linha.contatos === 0 && linha.valorAberto > 0).length,
                    detalhe: String(statsPorUnidade.filter((linha) => linha.contatos === 0 && linha.valorAberto > 0).length),
                    tom: "navy",
                  },
                ]}
              />
            </RelatorioPainel>
          </Grade>
        </section>
        <Grade>
          <RelatorioPainel titulo="Por advogado responsável">
            <GraficoEmpilhado
              chave={`${chave}-adv`}
              vazio={vazio}
              itens={porAdvogadoDebito.map((linha) => ({ nome: linha.nome, ate: linha.ate, acima: linha.acima, detalhe: dinheiro(linha.valor) }))}
            />
          </RelatorioPainel>
          <RelatorioPainel titulo="Grupos: amigável x jurídico">
            <GraficoEmpilhado
              chave={`${chave}-fase-grupo`}
              vazio={vazio}
              itens={porGrupo.filter((linha) => linha.valor > 0).map((linha) => ({ nome: linha.nome, ate: linha.ate, acima: linha.acima, detalhe: dinheiro(linha.valor) }))}
            />
          </RelatorioPainel>
        </Grade>
        {(alertas.length > 0 || maiores.length > 0) && (
          <Grade>
            <RelatorioPainel titulo="Alertas jurídicos">
              <GraficoBarras
                chave={`${chave}-alertas`}
                vazio={vazio}
                itens={[
                  { nome: "Perto de 5 anos", valor: prescricao.length, detalhe: String(prescricao.length), tom: "critical" },
                  { nome: "Acordo descumprido", valor: acordosQuebrados.length, detalhe: String(acordosQuebrados.length), tom: "pending" },
                  { nome: "Passou de 60 dias no mês", valor: passaram60.length, detalhe: String(passaram60.length), tom: "brass" },
                ]}
              />
            </RelatorioPainel>
            <RelatorioPainel titulo="Dez maiores devedores">
              <GraficoBarras
                chave={`${chave}-devedores`}
                vazio={vazio}
                itens={maiores.map((linha) => ({
                  nome: `${linha.unidade}`,
                  valor: linha.valor,
                  detalhe: `${linha.condominio} · ${dinheiro(linha.valor)} · ${linha.dias} dias`,
                }))}
              />
            </RelatorioPainel>
          </Grade>
        )}
        {alertas.length > 0 ? (
          <TabelaTexto
            rotulo="Alertas para acompanhamento"
            colunas={["Alerta", "Unidade", "Descrição", "Dias", "Atualizado"]}
            linhas={alertas.map((linha) => [
              linha.tipo,
              nomeUnidade(linha.item.unidadeId),
              linha.item.descricao,
              String(diasDeAtraso(linha.item.dataVencimento, dataBase)),
              dinheiro(Number(linha.item.valorAtualizado) || 0),
            ])}
            pagina={pagina}
            onPagina={setPagina}
            vazio={vazio}
          />
        ) : null}
        <TabelaTexto
          rotulo="Estatística por unidade"
          colunas={["Unidade", "Condomínio", "Contatos", "Resposta", "Em aberto", "Dias", "Último contato"]}
          linhas={statsPorUnidade.map((linha) => [
            linha.nome,
            linha.condominio,
            String(linha.contatos),
            percentual(linha.resposta),
            dinheiro(linha.valorAberto),
            String(linha.dias),
            linha.ultimo,
          ])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
        <TabelaTexto
          rotulo="Débitos em aberto"
          colunas={["Condomínio", "Unidade", "Grupo", "Vencimento", "Dias", "Atualizado"]}
          linhas={listaDebitos.map((item) => {
            const condominio = cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId);
            const dias = diasDeAtraso(item.dataVencimento, dataBase);
            return [
              condominio?.nome ?? "—",
              nomeUnidade(item.unidadeId),
              grupoDebito(item.descricao),
              formatarData(item.dataVencimento),
              String(dias),
              dinheiro(Number(item.valorAtualizado) || 0),
            ];
          })}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  }

  function destaqueHub(id: RelatorioId) {
    if (id === "produtividade") {
      return podeFiltrarPorRe ? "Por RE e período · exportável" : "Exclusivo da administradora";
    }
    if (id === "equipe") return `${metricAtendimentos} atendimentos · ${percentual(metricTaxaResposta)} com resposta`;
    if (id === "retornos") return `${metricRetornosAgenda} na agenda · ${metricRetornosAtrasados} atrasado${metricRetornosAtrasados === 1 ? "" : "s"}`;
    if (id === "efetividade") {
      return cruzamento.length ? `${comResultado} de ${cruzamento.length} com efeito no mês seguinte` : "Sem unidades contatadas no período";
    }
    const aberto = statsPorUnidade.reduce((total, linha) => total + linha.valorAberto, 0);
    return totalAberto > 0
      ? `${dinheiro(totalAberto)} · ${statsPorUnidade.length} unidades`
      : statsPorUnidade.length > 0
        ? `${statsPorUnidade.length} unidades no recorte`
        : "Nenhum débito no recorte";
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title={atual?.titulo ?? "Relatórios"}
        description={
          atual?.descricao ??
          "Relatórios de produtividade por RE, operação da equipe, retornos, efetividade e carteira. Filtre o período e exporte pelo menu no topo."
        }
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Relatórios", href: relatorio ? "/relatorios" : undefined },
          ...(atual ? [{ label: atual.titulo }] : []),
        ]}
        actions={relatorio && pode("relatorios", "exportar") ? <TableExport onExport={aoExportar} /> : undefined}
      />
      <PageContent>
        {!relatorio ? (
          <div className="grid min-w-0 grid-cols-1 gap-lg min-[640px]:grid-cols-2 min-[1280px]:grid-cols-4">
            {relatoriosHub.map((item) => {
              const atencao = (item.id === "retornos" && retornosAtrasados > 0) || (item.id === "carteira" && alertas.length > 0);
              return (
                <article
                  key={item.id}
                  className="flex h-full min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card min-[640px]:p-md min-[1280px]:p-lg"
                >
                  <div className="flex items-start justify-between gap-sm">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-primary-container">
                      <Icon icon={item.icon} size="md" />
                    </span>
                    <Badge variant={atencao ? "error" : "primary"} className="max-w-[55%] shrink truncate">
                      {atencao ? "Atenção" : item.selo}
                    </Badge>
                  </div>
                  <div className="flex min-w-0 flex-col gap-xs">
                    <h2 className="text-headline-sm text-on-surface">{item.titulo}</h2>
                    <p className="text-body-sm text-on-surface-variant">{item.descricao}</p>
                    <p className="text-body-sm font-medium text-primary-container min-[1280px]:text-body-md">{destaqueHub(item.id)}</p>
                  </div>
                  <Button className="mt-auto w-full" size="sm" onClick={() => abrirRelatorio(item.id)}>
                    <Icon icon={ArrowUpRight} size="sm" />
                    Abrir relatório
                  </Button>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col gap-lg">
            <VoltarRelatoriosHub />
            <RelatorioFiltros>
              <FilterBar
              searchValue={filtro.busca}
              onSearchChange={(buscaAtual) => setFiltro((atualFiltro) => ({ ...atualFiltro, busca: buscaAtual }))}
              searchPlaceholder={
                relatorio === "carteira" ? "Buscar condomínio, unidade ou cobrança..." : "Buscar condomínio, unidade ou assunto..."
              }
              onApply={() => {
                setAplicado(filtro);
                setPagina(1);
              }}
              onClear={() => {
                setFiltro(filtroInicial);
                setAplicado(filtroInicial);
                setPagina(1);
              }}
              fields={camposFiltro}
            />
            </RelatorioFiltros>
            <div className="flex flex-col gap-xl">{corpo}</div>
          </div>
        )}
      </PageContent>
    </WorkspaceShell>
  );
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RelatoriosPage />
    </Suspense>
  );
}
