"use client";

import { useState, useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import { BarChart3, FileSpreadsheet, FileText } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { type PeriodPreset, resolverPeriodo } from "@/components/period-input";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/tabs";
import { useToast } from "@/components/toast";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  acimaDoLimite,
  advogados,
  canaisAtendimento,
  debitoAbertoNaData,
  diasDeAtraso,
  faixasAtraso,
  formatarData,
  getCadastros,
  grupoDebito,
  gruposDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  motivosPendencia,
  nomeUnidade,
  nomeUsuario,
  situacaoRetorno,
  subscribeCadastros,
  type Atendimento,
  type Condominio,
  type Debito,
} from "@/data/catalogo";
import { exportarExcel, exportarPdf } from "@/lib/exportar";

const filtroInicial = {
  busca: "",
  preset: "mes" as PeriodPreset,
  de: "",
  ate: "",
  advogado: "todos",
  condominio: "todos",
  atendente: "todos",
  respondeu: "todos",
  motivo: "todos",
  canal: "todos",
};

const largurasBarra = [
  "w-0",
  "w-1/12",
  "w-2/12",
  "w-3/12",
  "w-4/12",
  "w-5/12",
  "w-6/12",
  "w-7/12",
  "w-8/12",
  "w-9/12",
  "w-10/12",
  "w-11/12",
  "w-full",
] as const;

const alturasColuna = [
  "h-0",
  "h-1/12",
  "h-2/12",
  "h-3/12",
  "h-4/12",
  "h-5/12",
  "h-6/12",
  "h-7/12",
  "h-8/12",
  "h-9/12",
  "h-10/12",
  "h-11/12",
  "h-full",
] as const;

const rotuloRetorno = { atrasado: "Atrasado", hoje: "Hoje", semana: "Próximos 7 dias", agendado: "Agendado" } as const;

function isoData(data: Date) {
  const pad = (parte: number) => String(parte).padStart(2, "0");
  return `${data.getFullYear()}-${pad(data.getMonth() + 1)}-${pad(data.getDate())}`;
}

function dentro(data: string, inicio: string, fim: string) {
  const dia = data.slice(0, 10);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
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

function indiceEscala(parte: number, total: number) {
  if (total <= 0 || parte <= 0) return 0;
  return Math.min(12, Math.max(1, Math.round((parte / total) * 12)));
}

function Painel({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-md rounded-lg border border-border-subtle bg-surface-card p-md">
      <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
      {children}
    </section>
  );
}

function GraficoColunas({
  titulo,
  linhas,
  vazio,
}: {
  titulo: string;
  linhas: Array<{ nome: string; quantidade: number; rotulo?: string }>;
  vazio: ReactNode;
}) {
  const maximo = Math.max(...linhas.map((linha) => linha.quantidade), 0);
  return (
    <Painel titulo={titulo}>
      {linhas.length === 0 || maximo === 0 ? (
        vazio
      ) : (
        <div className="flex items-end gap-sm overflow-x-auto">
          {linhas.map((linha) => (
            <div key={linha.nome} className="flex w-24 shrink-0 flex-col items-center gap-xs">
              <span className="text-center text-body-sm tabular-nums text-on-surface">{linha.rotulo ?? linha.quantidade}</span>
              <div className="flex h-32 w-full items-end">
                <div className={`w-full rounded-t-md bg-primary-container ${alturasColuna[indiceEscala(linha.quantidade, maximo)]}`} />
              </div>
              <span className="w-full truncate text-center text-body-sm text-on-surface-variant" title={linha.nome}>
                {linha.nome}
              </span>
            </div>
          ))}
        </div>
      )}
    </Painel>
  );
}

function GraficoBarras({
  titulo,
  linhas,
  vazio,
}: {
  titulo: string;
  linhas: Array<{ nome: string; quantidade: number; detalhe: string; tom?: "primary" | "brass" | "settled" | "pending" }>;
  vazio: ReactNode;
}) {
  const maximo = Math.max(...linhas.map((linha) => linha.quantidade), 0);
  const tom = {
    primary: "bg-primary-container",
    brass: "bg-brass",
    settled: "bg-status-settled",
    pending: "bg-status-pending",
  };
  return (
    <Painel titulo={titulo}>
      {linhas.length === 0 || maximo === 0 ? (
        vazio
      ) : (
        <ul className="flex flex-col gap-md">
          {linhas.map((linha) => (
            <li key={linha.nome} className="flex flex-col gap-xs">
              <div className="flex items-baseline justify-between gap-sm">
                <span className="truncate text-body-md text-on-surface" title={linha.nome}>
                  {linha.nome}
                </span>
                <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{linha.detalhe}</span>
              </div>
              <div className="h-md overflow-hidden rounded-full bg-surface-subtle">
                <div className={`h-full rounded-full ${tom[linha.tom ?? "primary"]} ${largurasBarra[indiceEscala(linha.quantidade, maximo)]}`} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

function GraficoEmpilhado({
  titulo,
  linhas,
  vazio,
}: {
  titulo: string;
  linhas: Array<{ nome: string; ate: number; acima: number; detalhe: string }>;
  vazio: ReactNode;
}) {
  const maximo = Math.max(...linhas.map((linha) => linha.ate + linha.acima), 0);
  return (
    <Painel titulo={titulo}>
      <p className="flex flex-wrap gap-md text-body-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-xs">
          <span className="size-sm rounded-sm bg-brass" />
          Até 60 dias
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="size-sm rounded-sm bg-primary-container" />
          Acima de 60 dias
        </span>
      </p>
      {linhas.length === 0 || maximo === 0 ? (
        vazio
      ) : (
        <ul className="flex flex-col gap-md">
          {linhas.map((linha) => {
            const soma = linha.ate + linha.acima;
            return (
              <li key={linha.nome} className="flex flex-col gap-xs">
                <div className="flex items-baseline justify-between gap-sm">
                  <span className="truncate text-body-md text-on-surface" title={linha.nome}>
                    {linha.nome}
                  </span>
                  <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{linha.detalhe}</span>
                </div>
                <div className="h-md overflow-hidden rounded-full bg-surface-subtle">
                  <div className={`flex h-full ${largurasBarra[indiceEscala(soma, maximo)]}`}>
                    <div className={`h-full bg-brass ${largurasBarra[indiceEscala(linha.ate, soma)]}`} />
                    <div className={`h-full bg-primary-container ${largurasBarra[indiceEscala(linha.acima, soma)]}`} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

function agruparContagem(chaves: string[]) {
  const mapa = new Map<string, number>();
  for (const chave of chaves) mapa.set(chave || "—", (mapa.get(chave || "—") ?? 0) + 1);
  const total = chaves.length;
  return [...mapa.entries()]
    .map(([nome, quantidade]) => ({ nome, quantidade, percentual: total ? (quantidade / total) * 100 : 0 }))
    .sort((a, b) => b.quantidade - a.quantidade || a.nome.localeCompare(b.nome, "pt-BR"));
}

function somar(itens: Array<{ valorAtualizado: string }>) {
  return itens.reduce((total, item) => total + (Number(item.valorAtualizado) || 0), 0);
}

function faixaDe(dias: number) {
  return faixasAtraso.find((faixa) => dias >= faixa.min && dias <= faixa.max)?.label ?? "—";
}

function abertoNaData(debito: Debito, dataBase: string) {
  return debitoAbertoNaData(debito, dataBase);
}

function cruzou60NoMes(vencimento: string, dataBase: string) {
  const marco = new Date(`${vencimento}T00:00:00`);
  marco.setDate(marco.getDate() + LIMITE_AMIGAVEL_DIAS);
  return isoData(marco).slice(0, 7) === dataBase.slice(0, 7);
}

export default function RelatoriosPage() {
  const { toast } = useToast();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const [aba, setAba] = useState("atendimentos");
  const [filtro, setFiltro] = useState(filtroInicial);
  const [aplicado, setAplicado] = useState(filtroInicial);
  const [pageLista, setPageLista] = useState(1);
  const [pageRetornos, setPageRetornos] = useState(1);
  const [pageDebitos, setPageDebitos] = useState(1);
  const hoje = hojeIso();
  const periodo = resolverPeriodo(aplicado, hoje);
  const dataBase = periodo.fim || hoje;
  const busca = aplicado.busca.trim().toLocaleLowerCase("pt-BR");

  function condominioDaUnidade(unidadeId: string) {
    const unidade = cadastros.unidades.find((item) => String(item.id) === String(unidadeId));
    if (!unidade) return undefined;
    return cadastros.condominios.find((item) => item.id === unidade.condominioId);
  }

  function combinaCarteira(condominio: Condominio | undefined) {
    if (!condominio) return false;
    if (aplicado.advogado !== "todos" && condominio.advogado !== aplicado.advogado) return false;
    if (aplicado.condominio !== "todos" && String(condominio.id) !== aplicado.condominio) return false;
    return true;
  }

  const atendimentos = cadastros.atendimentos.filter((item) => {
    if (!dentro(item.dataHora, periodo.inicio, periodo.fim)) return false;
    const condominio = condominioDaUnidade(item.unidadeId);
    if (!combinaCarteira(condominio)) return false;
    if (aplicado.atendente !== "todos" && String(item.usuarioId) !== aplicado.atendente) return false;
    if (aplicado.respondeu !== "todos" && item.respondeu !== aplicado.respondeu) return false;
    if (aplicado.motivo !== "todos" && item.motivo !== aplicado.motivo) return false;
    if (aplicado.canal !== "todos" && item.canal !== aplicado.canal) return false;
    const texto = `${item.assunto} ${item.descricao} ${item.motivo} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase("pt-BR");
    return busca.length === 0 || texto.includes(busca);
  });

  const responderam = atendimentos.filter((item) => item.respondeu === "Sim").length;
  const unidadesContatadas = new Set(atendimentos.map((item) => item.unidadeId)).size;
  const retornos = atendimentos
    .filter((item) => item.status !== "Resolvido" && item.dataProximaAcao)
    .sort((a, b) => a.dataProximaAcao.localeCompare(b.dataProximaAcao));
  const taxaResposta = atendimentos.length ? (responderam / atendimentos.length) * 100 : 0;
  const serieLonga = periodoLongo(periodo.inicio, periodo.fim);
  const serieMapa = new Map<string, number>();
  for (const item of atendimentos) {
    const chave = serieLonga ? item.dataHora.slice(0, 7) : item.dataHora.slice(0, 10);
    serieMapa.set(chave, (serieMapa.get(chave) ?? 0) + 1);
  }
  const serie = [...serieMapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([chave, quantidade]) => ({
      nome: serieLonga ? chave : formatarData(chave),
      quantidade,
      percentual: atendimentos.length ? (quantidade / atendimentos.length) * 100 : 0,
    }));
  const porCondominio = agruparContagem(atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.nome ?? "—"));
  const porAtendente = agruparContagem(atendimentos.map((item) => nomeUsuario(item.usuarioId)));
  const porAdvogado = agruparContagem(atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.advogado ?? "—"));
  const porMeio = agruparContagem(atendimentos.map((item) => item.canal || "—"));
  const porMotivo = agruparContagem(atendimentos.filter((item) => item.respondeu === "Sim").map((item) => item.motivo || "—"));
  const respondeuGrupo = agruparContagem(atendimentos.map((item) => item.respondeu || "—"));

  const resumoCondominio = porCondominio.map((linha) => {
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

  const cruzamento = [...new Set(atendimentos.map((item) => item.unidadeId))].map((unidadeId) => {
    const contatos = atendimentos.filter((item) => item.unidadeId === unidadeId);
    const meses = new Set(contatos.map((item) => mesSeguinte(item.dataHora)));
    const pagamento = cadastros.debitos.find(
      (debito) =>
        String(debito.unidadeId) === unidadeId &&
        debito.status === "Pago" &&
        debito.dataPagamento &&
        meses.has(debito.dataPagamento.slice(0, 7)),
    );
    const acordo = cadastros.debitos.find(
      (debito) =>
        String(debito.unidadeId) === unidadeId &&
        grupoDebito(debito.descricao) === "Acordo" &&
        meses.has(debito.dataVencimento.slice(0, 7)),
    );
    return {
      unidade: nomeUnidade(unidadeId),
      contatos: contatos.length,
      resultado: pagamento ? "Pagou no mês seguinte" : acordo ? "Acordo no mês seguinte" : "Sem resultado no mês seguinte",
    };
  });

  const debitos = cadastros.debitos.filter((item) => {
    const condominio = cadastros.condominios.find((atual) => atual.id === item.condominioId);
    if (!combinaCarteira(condominio)) return false;
    if (!abertoNaData(item, dataBase)) return false;
    const texto = `${item.descricao} ${item.referencia} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase("pt-BR");
    return busca.length === 0 || texto.includes(busca);
  });
  const totalAberto = somar(debitos);
  const totalOriginal = debitos.reduce((total, item) => total + (Number(item.valorOriginal) || 0), 0);
  const ate60 = debitos.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
  const acima60 = debitos.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
  const unidadesDevedoras = new Set(debitos.map((item) => item.unidadeId)).size;
  const unidadesCarteira = cadastros.unidades.filter((item) => combinaCarteira(cadastros.condominios.find((atual) => atual.id === item.condominioId))).length;
  const percentualUnidades = unidadesCarteira ? (unidadesDevedoras / unidadesCarteira) * 100 : 0;

  const rankingCondominio = [...new Set(debitos.map((item) => item.condominioId))]
    .map((id) => {
      const itens = debitos.filter((item) => item.condominioId === id);
      const nome = cadastros.condominios.find((item) => item.id === id)?.nome ?? "—";
      const valor = somar(itens);
      return { nome, valor, percentual: totalAberto ? (valor / totalAberto) * 100 : 0 };
    })
    .sort((a, b) => b.valor - a.valor);

  const porAdvogadoDebito = advogados
    .map((advogado) => {
      const itens = debitos.filter((item) => cadastros.condominios.find((atual) => atual.id === item.condominioId)?.advogado === advogado);
      return {
        nome: advogado,
        valor: somar(itens),
        ate: somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        acima: somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
      };
    })
    .filter((linha) => linha.valor > 0);

  const porGrupo = gruposDebito.map((grupo) => {
    const itens = debitos.filter((item) => grupoDebito(item.descricao) === grupo);
    return {
      nome: grupo,
      valor: somar(itens),
      ate: somar(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
      acima: somar(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
      percentual: totalAberto ? (somar(itens) / totalAberto) * 100 : 0,
    };
  });

  const porFaixa = faixasAtraso.map((faixa) => {
    const itens = debitos.filter((item) => {
      const dias = diasDeAtraso(item.dataVencimento, dataBase);
      return dias >= faixa.min && dias <= faixa.max;
    });
    const valor = somar(itens);
    return { nome: faixa.label, valor, percentual: totalAberto ? (valor / totalAberto) * 100 : 0 };
  });

  const maiores = [...new Set(debitos.map((item) => item.unidadeId))]
    .map((unidadeId) => {
      const itens = debitos.filter((item) => item.unidadeId === unidadeId);
      const dias = Math.max(...itens.map((item) => diasDeAtraso(item.dataVencimento, dataBase)));
      return { unidade: nomeUnidade(unidadeId), valor: somar(itens), dias };
    })
    .sort((a, b) => b.valor - a.valor)
    .slice(0, 10);

  const evolucao = [...new Set(debitos.map((item) => item.referencia || "—"))]
    .map((referencia) => ({ referencia, valor: somar(debitos.filter((item) => (item.referencia || "—") === referencia)) }))
    .sort((a, b) => a.referencia.localeCompare(b.referencia, "pt-BR"));

  const prescricao = debitos.filter((item) => diasDeAtraso(item.dataVencimento, dataBase) >= 1643);
  const acordosQuebrados = debitos.filter((item) => grupoDebito(item.descricao) === "Acordo" && diasDeAtraso(item.dataVencimento, dataBase) > 0);
  const passaram60 = debitos.filter((item) => cruzou60NoMes(item.dataVencimento, dataBase));

  const listaAtendimentos = [...atendimentos].sort((a, b) => b.dataHora.localeCompare(a.dataHora));
  const paginaAtendimentos = listaAtendimentos.slice((pageLista - 1) * PAGE_SIZE, pageLista * PAGE_SIZE);
  const paginaRetornos = retornos.slice((pageRetornos - 1) * PAGE_SIZE, pageRetornos * PAGE_SIZE);
  const listaDebitos = [...debitos].sort((a, b) => b.valorAtualizado.localeCompare(a.valorAtualizado, "pt-BR", { numeric: true }));
  const paginaDebitos = listaDebitos.slice((pageDebitos - 1) * PAGE_SIZE, pageDebitos * PAGE_SIZE);

  function zerarPaginas() {
    setPageLista(1);
    setPageRetornos(1);
    setPageDebitos(1);
  }

  function handleApply() {
    setAplicado(filtro);
    zerarPaginas();
  }

  function handleClear() {
    setFiltro(filtroInicial);
    setAplicado(filtroInicial);
    zerarPaginas();
  }

  function linhaAtendimento(item: Atendimento) {
    const condominio = condominioDaUnidade(item.unidadeId);
    return [
      formatarData(item.dataHora),
      condominio?.nome ?? "—",
      nomeUnidade(item.unidadeId),
      nomeUsuario(item.usuarioId),
      condominio?.advogado ?? "—",
      item.canal,
      item.respondeu || "—",
      item.motivo || "—",
      item.assunto || "—",
      item.descricao || "—",
      formatarData(item.dataProximaAcao),
      item.proximaAcao || "—",
      item.status,
    ];
  }

  function linhaDebito(item: Debito) {
    const condominio = cadastros.condominios.find((atual) => atual.id === item.condominioId);
    const dias = diasDeAtraso(item.dataVencimento, dataBase);
    return [
      condominio?.nome ?? "—",
      condominio?.advogado ?? "—",
      nomeUnidade(item.unidadeId),
      item.referencia,
      item.descricao || "—",
      grupoDebito(item.descricao),
      formatarData(item.dataVencimento),
      String(dias),
      dinheiro(Number(item.valorOriginal) || 0),
      dinheiro(Number(item.valorAtualizado) || 0),
      item.status,
      faixaDe(dias),
    ];
  }

  function exportar() {
    if (aba === "atendimentos") {
      exportarExcel(
        "relatorio-atendimentos.xls",
        ["Data", "Condomínio", "Unidade", "Atendente", "Advogado", "Meio", "Respondeu", "Motivo", "Assunto", "Descrição", "Retorno", "Próxima ação", "Situação"],
        listaAtendimentos.map(linhaAtendimento),
      );
      return;
    }
    exportarExcel(
      "relatorio-inadimplencia.xls",
      ["Condomínio", "Advogado", "Unidade", "Referência", "Descrição", "Grupo", "Vencimento", "Dias", "Original", "Atualizado", "Situação", "Faixa"],
      listaDebitos.map(linhaDebito),
    );
  }

  function imprimir() {
    const secoes =
      aba === "atendimentos"
        ? [
            { titulo: "Totais", colunas: ["Indicador", "Valor"], linhas: [["Atendimentos", String(atendimentos.length)], ["Responderam", percentual(taxaResposta)], ["Unidades contatadas", String(unidadesContatadas)], ["Retornos pendentes", String(retornos.length)]] },
            { titulo: serieLonga ? "Atendimentos por mês" : "Atendimentos por dia", colunas: ["Período", "Quantidade", "Percentual"], linhas: serie.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Motivo da pendência", colunas: ["Motivo", "Quantidade", "Percentual"], linhas: porMotivo.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Respondeu", colunas: ["Resposta", "Quantidade", "Percentual"], linhas: respondeuGrupo.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Por condomínio", colunas: ["Condomínio", "Quantidade", "Percentual"], linhas: porCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Por atendente", colunas: ["Atendente", "Quantidade", "Percentual"], linhas: porAtendente.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Por advogado", colunas: ["Advogado", "Quantidade", "Percentual"], linhas: porAdvogado.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Por meio", colunas: ["Meio", "Quantidade", "Percentual"], linhas: porMeio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
            { titulo: "Resumo por condomínio", colunas: ["Condomínio", "Atendimentos", "Resposta", "Unidades", "Último"], linhas: resumoCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta), String(linha.unidades), linha.ultimo]) },
            { titulo: "Retornos pendentes", colunas: ["Quando", "Unidade", "Atendente", "Ação", "Situação"], linhas: retornos.map((item) => [formatarData(item.dataProximaAcao), nomeUnidade(item.unidadeId), nomeUsuario(item.usuarioId), item.proximaAcao || "—", rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"] ?? "—"]) },
            { titulo: "Contato e resultado no mês seguinte", colunas: ["Unidade", "Contatos", "Resultado"], linhas: cruzamento.map((linha) => [linha.unidade, String(linha.contatos), linha.resultado]) },
            { titulo: "Lista detalhada", colunas: ["Data", "Condomínio", "Unidade", "Atendente", "Advogado", "Meio", "Respondeu", "Motivo", "Assunto", "Descrição", "Retorno", "Próxima ação", "Situação"], linhas: listaAtendimentos.map(linhaAtendimento) },
          ]
        : [
            { titulo: "Carteira", colunas: ["Indicador", "Valor"], linhas: [["Valor original", dinheiro(totalOriginal)], ["Valor atualizado", dinheiro(totalAberto)], ["Até 60 dias", dinheiro(somar(ate60))], ["Acima de 60 dias", dinheiro(somar(acima60))], ["Unidades com débito", percentual(percentualUnidades)], ["Valor emitido", "O total emitido no período ainda não vem na importação"]] },
            { titulo: "Ranking de condomínios", colunas: ["Condomínio", "Em aberto", "Participação"], linhas: rankingCondominio.map((linha) => [linha.nome, dinheiro(linha.valor), percentual(linha.percentual)]) },
            { titulo: "Por advogado", colunas: ["Advogado", "Em aberto", "Até 60", "Acima de 60"], linhas: porAdvogadoDebito.map((linha) => [linha.nome, dinheiro(linha.valor), dinheiro(linha.ate), dinheiro(linha.acima)]) },
            { titulo: "Por grupo", colunas: ["Grupo", "Total", "Até 60", "Acima de 60", "Participação"], linhas: porGrupo.map((linha) => [linha.nome, dinheiro(linha.valor), dinheiro(linha.ate), dinheiro(linha.acima), percentual(linha.percentual)]) },
            { titulo: "Faixas de atraso", colunas: ["Faixa", "Em aberto", "Participação"], linhas: porFaixa.map((linha) => [linha.nome, dinheiro(linha.valor), percentual(linha.percentual)]) },
            { titulo: "10 maiores devedores", colunas: ["Unidade", "Em aberto", "Dias"], linhas: maiores.map((linha) => [linha.unidade, dinheiro(linha.valor), String(linha.dias)]) },
            { titulo: "Evolução por referência", colunas: ["Referência", "Em aberto"], linhas: evolucao.map((linha) => [linha.referencia, dinheiro(linha.valor)]) },
            { titulo: "Alertas jurídicos", colunas: ["Alerta", "Unidade", "Descrição", "Dias", "Atualizado"], linhas: [...prescricao.map((item) => ["Perto de 5 anos", nomeUnidade(item.unidadeId), item.descricao, String(diasDeAtraso(item.dataVencimento, dataBase)), dinheiro(Number(item.valorAtualizado) || 0)]), ...acordosQuebrados.map((item) => ["Acordo descumprido", nomeUnidade(item.unidadeId), item.descricao, String(diasDeAtraso(item.dataVencimento, dataBase)), dinheiro(Number(item.valorAtualizado) || 0)]), ...passaram60.map((item) => ["Passou de 60 dias no mês", nomeUnidade(item.unidadeId), item.descricao, String(diasDeAtraso(item.dataVencimento, dataBase)), dinheiro(Number(item.valorAtualizado) || 0)])] },
            { titulo: "Unidades e débitos", colunas: ["Condomínio", "Advogado", "Unidade", "Referência", "Descrição", "Grupo", "Vencimento", "Dias", "Original", "Atualizado", "Situação", "Faixa"], linhas: listaDebitos.map(linhaDebito) },
          ];
    const abriu = exportarPdf(
      aba === "atendimentos" ? "Relatório de atendimentos" : "Relatório de inadimplência",
      aba === "atendimentos" ? "relatorio-atendimentos.html" : "relatorio-inadimplencia.html",
      secoes,
    );
    if (!abriu) {
      toast({
        variant: "info",
        title: "Relatório baixado",
        description: "Abra o arquivo e use imprimir para salvar em PDF.",
      });
    }
  }

  const vazio = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Nenhum registro no período" description="Ajuste o período ou os filtros." />
  );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Relatórios"
        description="Produtividade da equipe e inadimplência da carteira, no período escolhido."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Relatórios" }]}
      />
      <PageContent>
        <FilterBar
          searchValue={filtro.busca}
          onSearchChange={(buscaAtual) => setFiltro((atual) => ({ ...atual, busca: buscaAtual }))}
          searchPlaceholder="Buscar condomínio, unidade ou assunto..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "periodo",
              label: "Período",
              type: "period",
              value: { preset: filtro.preset, de: filtro.de, ate: filtro.ate },
              onChange: (periodo) => setFiltro((atual) => ({ ...atual, ...periodo })),
            },
            {
              id: "advogado",
              label: "Advogado",
              value: filtro.advogado,
              onChange: (advogado) => setFiltro((atual) => ({ ...atual, advogado })),
              options: [{ value: "todos", label: "Todos" }, ...advogados.map((item) => ({ value: item, label: item }))],
            },
            {
              id: "condominio",
              label: "Condomínio",
              value: filtro.condominio,
              onChange: (condominio) => setFiltro((atual) => ({ ...atual, condominio })),
              options: [{ value: "todos", label: "Todos" }, ...cadastros.condominios.map((item) => ({ value: String(item.id), label: item.nome }))],
            },
            {
              id: "atendente",
              label: "Atendente",
              value: filtro.atendente,
              onChange: (atendente) => setFiltro((atual) => ({ ...atual, atendente })),
              options: [{ value: "todos", label: "Todos" }, ...cadastros.usuarios.map((item) => ({ value: String(item.id), label: item.nome }))],
            },
            {
              id: "respondeu",
              label: "Respondeu",
              value: filtro.respondeu,
              onChange: (respondeu) => setFiltro((atual) => ({ ...atual, respondeu })),
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
              onChange: (motivo) => setFiltro((atual) => ({ ...atual, motivo })),
              options: [{ value: "todos", label: "Todos" }, ...motivosPendencia.map((item) => ({ value: item, label: item }))],
            },
            {
              id: "meio",
              label: "Meio",
              value: filtro.canal,
              onChange: (canal) => setFiltro((atual) => ({ ...atual, canal })),
              options: [{ value: "todos", label: "Todos" }, ...canaisAtendimento.map((item) => ({ value: item, label: item }))],
            },
          ]}
        />
        <div className="flex flex-wrap justify-end gap-sm">
          <Button size="sm" variant="outline" onClick={exportar}>
            <Icon icon={FileSpreadsheet} size="sm" />
            Excel
          </Button>
          <Button size="sm" variant="outline" onClick={imprimir}>
            <Icon icon={FileText} size="sm" />
            PDF
          </Button>
        </div>
        <Tabs defaultValue="atendimentos" value={aba} onValueChange={setAba}>
          <TabsList>
            <TabsTrigger value="atendimentos">Atendimentos</TabsTrigger>
            <TabsTrigger value="inadimplencia">Inadimplência</TabsTrigger>
          </TabsList>
          <TabsContent value="atendimentos" className="flex flex-col gap-lg pt-lg">
            <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{String(atendimentos.length).padStart(2, "0")}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">atendimentos</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{percentual(taxaResposta)}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">responderam</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{String(unidadesContatadas).padStart(2, "0")}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">unidades contatadas</p>
              </CardMetric>
              <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={BarChart3} size="md" className="text-brass" />}>
                <p className="text-metric text-on-surface tabular-nums">{String(retornos.length).padStart(2, "0")}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">retornos pendentes</p>
              </CardMetric>
            </div>
            <GraficoColunas
              titulo={serieLonga ? "Atendimentos por mês" : "Atendimentos por dia"}
              linhas={serie}
              vazio={vazio}
            />
            <div className="grid grid-cols-1 gap-lg min-[961px]:grid-cols-2">
              <GraficoBarras
                titulo="Motivo da pendência"
                linhas={porMotivo.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="Respondeu"
                linhas={respondeuGrupo.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                  tom: linha.nome === "Sim" ? "settled" : linha.nome === "Não" ? "pending" : "primary",
                }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="Por condomínio"
                linhas={porCondominio.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="Por atendente"
                linhas={porAtendente.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="Por advogado"
                linhas={porAdvogado.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="Por meio"
                linhas={porMeio.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.quantidade,
                  detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
            </div>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Resumo por condomínio</h2>
              <Table aria-label="Resumo por condomínio">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Atendimentos</TableHead>
                    <TableHead>Resposta</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Último</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resumoCondominio.length === 0 ? (
                    <TableEmpty colSpan={5}>{vazio}</TableEmpty>
                  ) : (
                    resumoCondominio.map((linha) => (
                      <TableRow key={linha.nome}>
                        <TableCell className="font-medium">{linha.nome}</TableCell>
                        <TableCell className="tabular-nums">{linha.quantidade}</TableCell>
                        <TableCell className="tabular-nums">{percentual(linha.resposta)}</TableCell>
                        <TableCell className="tabular-nums">{linha.unidades}</TableCell>
                        <TableCell>{linha.ultimo}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Retornos pendentes</h2>
              <Table aria-label="Retornos pendentes">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Quando</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Próxima ação</TableHead>
                    <TableHead>Situação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {retornos.length === 0 ? (
                    <TableEmpty colSpan={5}>{vazio}</TableEmpty>
                  ) : (
                    paginaRetornos.map((item) => {
                      const situacao = situacaoRetorno(item.dataProximaAcao);
                      return (
                        <TableRow key={item.id}>
                          <TableCell>{formatarData(item.dataProximaAcao)}</TableCell>
                          <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                          <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
                          <TableCell>{item.proximaAcao || "—"}</TableCell>
                          <TableCell>
                            <Badge variant={situacao === "atrasado" ? "error" : "secondary"}>
                              {situacao ? rotuloRetorno[situacao] : "—"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
              {retornos.length > 0 ? <Pagination page={pageRetornos} total={retornos.length} onPageChange={setPageRetornos} /> : null}
            </section>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Contato e resultado no mês seguinte</h2>
              <Table aria-label="Contato e resultado">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Unidade</TableHead>
                    <TableHead>Contatos</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cruzamento.length === 0 ? (
                    <TableEmpty colSpan={3}>{vazio}</TableEmpty>
                  ) : (
                    cruzamento.map((linha) => (
                      <TableRow key={linha.unidade}>
                        <TableCell className="font-medium">{linha.unidade}</TableCell>
                        <TableCell className="tabular-nums">{linha.contatos}</TableCell>
                        <TableCell>{linha.resultado}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </section>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Lista detalhada</h2>
              <Table aria-label="Lista detalhada de atendimentos">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Data</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Atendente</TableHead>
                    <TableHead>Meio</TableHead>
                    <TableHead>Respondeu</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaAtendimentos.length === 0 ? (
                    <TableEmpty colSpan={6}>{vazio}</TableEmpty>
                  ) : (
                    paginaAtendimentos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{formatarData(item.dataHora)}</TableCell>
                        <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                        <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
                        <TableCell>{item.canal}</TableCell>
                        <TableCell>{item.respondeu || "—"}</TableCell>
                        <TableCell>{item.motivo || "—"}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {listaAtendimentos.length > 0 ? <Pagination page={pageLista} total={listaAtendimentos.length} onPageChange={setPageLista} /> : null}
            </section>
          </TabsContent>
          <TabsContent value="inadimplencia" className="flex flex-col gap-lg pt-lg">
            <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
              <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={BarChart3} size="md" className="text-brass" />}>
                <p className="text-metric text-on-surface tabular-nums">{dinheiro(totalOriginal)}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">valor original</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{dinheiro(totalAberto)}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">valor atualizado</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{dinheiro(somar(ate60))}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">até 60 dias</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{dinheiro(somar(acima60))}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">acima de 60 dias</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">{percentual(percentualUnidades)}</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">inadimplência das unidades</p>
              </CardMetric>
              <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={BarChart3} size="md" />}>
                <p className="text-metric text-on-surface tabular-nums">—</p>
                <p className="mt-sm text-body-sm text-on-surface-variant">inadimplência do valor</p>
              </CardMetric>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              O percentual de unidades usa as unidades já cadastradas. O percentual sobre o valor emitido depende do total emitido no período, que a importação ainda não traz. A data-base é {formatarData(dataBase)}.
            </p>
            <GraficoEmpilhado
              titulo="Até 60 dias e acima de 60 dias"
              linhas={[
                {
                  nome: "Carteira",
                  ate: somar(ate60),
                  acima: somar(acima60),
                  detalhe: `${dinheiro(somar(ate60))} · ${dinheiro(somar(acima60))}`,
                },
              ]}
              vazio={vazio}
            />
            <div className="grid grid-cols-1 gap-lg min-[961px]:grid-cols-2">
              <GraficoBarras
                titulo="Ranking de condomínios"
                linhas={rankingCondominio.map((linha) => ({
                  nome: linha.nome,
                  quantidade: linha.valor,
                  detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoEmpilhado
                titulo="Por advogado"
                linhas={porAdvogadoDebito.map((linha) => ({
                  nome: linha.nome,
                  ate: linha.ate,
                  acima: linha.acima,
                  detalhe: dinheiro(linha.valor),
                }))}
                vazio={vazio}
              />
              <GraficoEmpilhado
                titulo="Cota, taxa extra, acordo e multa"
                linhas={porGrupo.map((linha) => ({
                  nome: linha.nome,
                  ate: linha.ate,
                  acima: linha.acima,
                  detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentual)}`,
                }))}
                vazio={vazio}
              />
              <GraficoColunas
                titulo="Faixas de atraso"
                linhas={porFaixa.map((linha) => ({ nome: linha.nome, quantidade: linha.valor, rotulo: dinheiro(linha.valor) }))}
                vazio={vazio}
              />
              <GraficoBarras
                titulo="10 maiores devedores"
                linhas={maiores.map((linha) => ({
                  nome: linha.unidade,
                  quantidade: linha.valor,
                  detalhe: `${dinheiro(linha.valor)} · ${linha.dias} dias`,
                }))}
                vazio={vazio}
              />
              <GraficoColunas
                titulo="Evolução por referência"
                linhas={evolucao.map((linha) => ({ nome: linha.referencia, quantidade: linha.valor, rotulo: dinheiro(linha.valor) }))}
                vazio={vazio}
              />
            </div>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Alertas jurídicos</h2>
              <Table aria-label="Alertas jurídicos">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Alerta</TableHead>
                    <TableHead>Unidade</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {prescricao.length + acordosQuebrados.length + passaram60.length === 0 ? (
                    <TableEmpty colSpan={5}>{vazio}</TableEmpty>
                  ) : (
                    <>
                      {prescricao.map((item) => (
                        <TableRow key={`p-${item.id}`}>
                          <TableCell>Perto de 5 anos</TableCell>
                          <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="tabular-nums">{diasDeAtraso(item.dataVencimento, dataBase)}</TableCell>
                          <TableCell className="tabular-nums">{dinheiro(Number(item.valorAtualizado) || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {acordosQuebrados.map((item) => (
                        <TableRow key={`a-${item.id}`}>
                          <TableCell>Acordo descumprido</TableCell>
                          <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="tabular-nums">{diasDeAtraso(item.dataVencimento, dataBase)}</TableCell>
                          <TableCell className="tabular-nums">{dinheiro(Number(item.valorAtualizado) || 0)}</TableCell>
                        </TableRow>
                      ))}
                      {passaram60.map((item) => (
                        <TableRow key={`s-${item.id}`}>
                          <TableCell>Passou de 60 dias no mês</TableCell>
                          <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                          <TableCell>{item.descricao}</TableCell>
                          <TableCell className="tabular-nums">{diasDeAtraso(item.dataVencimento, dataBase)}</TableCell>
                          <TableCell className="tabular-nums">{dinheiro(Number(item.valorAtualizado) || 0)}</TableCell>
                        </TableRow>
                      ))}
                    </>
                  )}
                </TableBody>
              </Table>
            </section>
            <section className="flex flex-col gap-md">
              <h2 className="text-headline-sm text-on-surface">Unidades e débitos</h2>
              <Table aria-label="Unidades e débitos">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Unidade</TableHead>
                    <TableHead>Grupo</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listaDebitos.length === 0 ? (
                    <TableEmpty colSpan={6}>{vazio}</TableEmpty>
                  ) : (
                    paginaDebitos.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                        <TableCell>{grupoDebito(item.descricao)}</TableCell>
                        <TableCell>{formatarData(item.dataVencimento)}</TableCell>
                        <TableCell className="tabular-nums">{diasDeAtraso(item.dataVencimento, dataBase)}</TableCell>
                        <TableCell className="tabular-nums">{dinheiro(Number(item.valorOriginal) || 0)}</TableCell>
                        <TableCell className="tabular-nums">{dinheiro(Number(item.valorAtualizado) || 0)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {listaDebitos.length > 0 ? <Pagination page={pageDebitos} total={listaDebitos.length} onPageChange={setPageDebitos} /> : null}
            </section>
          </TabsContent>
        </Tabs>
      </PageContent>
    </WorkspaceShell>
  );
}
