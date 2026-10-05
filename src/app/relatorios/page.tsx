"use client";

import { Suspense, useState, useSyncExternalStore } from "react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  FileSpreadsheet,
  FileText,
  Phone,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { GraficoBarras, GraficoCalor, GraficoColunas, GraficoEmpilhado, GraficoLinha, GraficoRosca, paleta } from "@/components/graficos";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import { type PeriodPreset, resolverPeriodo } from "@/components/period-input";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/table";
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
  preset: "30" as PeriodPreset,
  de: "",
  ate: "",
  advogado: "todos",
  condominio: "todos",
  atendente: "todos",
  respondeu: "todos",
  motivo: "todos",
  canal: "todos",
};

const rotuloRetorno = { atrasado: "Atrasado", hoje: "Hoje", semana: "Próximos 7 dias", agendado: "Agendado" } as const;

const TOPICOS: Array<{
  id: "cobranca" | "condominios" | "retornos" | "resultado" | "carteira" | "composicao" | "alertas";
  grupo: "cobranca" | "inadimplencia";
  selo: string;
  seloVariante: "primary" | "secondary" | "error";
  titulo: string;
  descricao: string;
  indicadores: string[];
  icon: LucideIcon;
}> = [
  {
    id: "cobranca",
    grupo: "cobranca",
    selo: "Operação",
    seloVariante: "primary",
    titulo: "Cobrança da equipe",
    descricao: "O ritmo dos contatos, quem respondeu, por qual meio e por qual motivo.",
    indicadores: ["Atendimentos", "Taxa de resposta", "Por dia", "Motivos", "Meios", "Equipe"],
    icon: Phone,
  },
  {
    id: "condominios",
    grupo: "cobranca",
    selo: "Gestão",
    seloVariante: "primary",
    titulo: "Condomínios e advogados",
    descricao: "Onde a equipe cobrou e qual advogado responde por cada condomínio.",
    indicadores: ["Por condomínio", "Por advogado", "Resposta", "Último contato"],
    icon: Building2,
  },
  {
    id: "retornos",
    grupo: "cobranca",
    selo: "Agenda",
    seloVariante: "secondary",
    titulo: "Retornos",
    descricao: "Combinados que ainda não tiveram baixa: atrasados, de hoje e da semana.",
    indicadores: ["Atrasados", "Hoje", "Próximos 7 dias", "Por atendente"],
    icon: CalendarClock,
  },
  {
    id: "resultado",
    grupo: "cobranca",
    selo: "Efetividade",
    seloVariante: "secondary",
    titulo: "Resultado da cobrança",
    descricao: "Unidades contatadas que pagaram ou fizeram acordo no mês seguinte.",
    indicadores: ["Pagou", "Acordo", "Sem resultado", "Unidades contatadas"],
    icon: Handshake,
  },
  {
    id: "carteira",
    grupo: "inadimplencia",
    selo: "Carteira",
    seloVariante: "primary",
    titulo: "Carteira em aberto",
    descricao: "O total vencido, o que ainda é amigável e o que já pede encaminhamento jurídico.",
    indicadores: ["Valor atualizado", "Até 60 dias", "Acima de 60 dias", "Ranking", "Advogados"],
    icon: Wallet,
  },
  {
    id: "composicao",
    grupo: "inadimplencia",
    selo: "Assembleia",
    seloVariante: "secondary",
    titulo: "Composição e atraso",
    descricao: "Cota, taxa extra, acordo e multa, separados pelo tempo de atraso.",
    indicadores: ["Cota ordinária", "Taxa extra", "Acordo", "Multa", "Faixas de atraso", "Competência"],
    icon: Layers,
  },
  {
    id: "alertas",
    grupo: "inadimplencia",
    selo: "Jurídico",
    seloVariante: "primary",
    titulo: "Alertas jurídicos",
    descricao: "Prescrição, acordo descumprido e as unidades com maior valor em aberto.",
    indicadores: ["Prescrição", "Acordos quebrados", "Passou de 60 dias", "Maiores devedores"],
    icon: TriangleAlert,
  },
];

type TopicoId = (typeof TOPICOS)[number]["id"];

const GRUPOS = [
  { id: "cobranca", titulo: "Cobrança", texto: "O que a equipe fez, com quem falou e o que aconteceu depois." },
  { id: "inadimplencia", titulo: "Inadimplência", texto: "O que está em aberto, há quanto tempo e de que tipo de cobrança." },
] as const;

function ehTopico(valor: string | null): valor is TopicoId {
  return TOPICOS.some((item) => item.id === valor);
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

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-lg min-[961px]:grid-cols-2">{children}</div>;
}

function Painel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <section className="flex min-w-0 flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-col gap-xs">
        <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Leitura({ children }: { children: ReactNode }) {
  return <p className="rounded-lg border border-border-subtle bg-gold-subtle px-md py-sm text-body-md text-on-surface">{children}</p>;
}

function Metrica({ valor, rotulo, destaque = false }: { valor: string; rotulo: string; destaque?: boolean }) {
  return (
    <CardMetric
      iconClassName={destaque ? "bg-gold-subtle text-brass" : "bg-surface-subtle text-on-surface-variant"}
      icon={<Icon icon={BarChart3} size="md" className={destaque ? "text-brass" : undefined} />}
    >
      <p className="text-metric text-on-surface tabular-nums">{valor}</p>
      <p className="mt-sm text-body-sm text-on-surface-variant">{rotulo}</p>
    </CardMetric>
  );
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
  const recorte = linhas.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE);
  return (
    <section className="flex flex-col gap-md">
      <h2 className="text-headline-sm text-on-surface">{rotulo}</h2>
      <Table aria-label={rotulo}>
        <TableHeader>
          <TableRow className="border-border-subtle/50 hover:bg-transparent">
            {colunas.map((coluna) => (
              <TableHead key={coluna}>{coluna}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {linhas.length === 0 ? (
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
      {linhas.length > PAGE_SIZE ? <Pagination page={pagina} total={linhas.length} onPageChange={onPagina} /> : null}
    </section>
  );
}

function RelatoriosPage() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const pedido = params?.get("topico") ?? null;
  const topico = ehTopico(pedido) ? pedido : null;
  const atual = TOPICOS.find((item) => item.id === topico);
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const [filtro, setFiltro] = useState(filtroInicial);
  const [aplicado, setAplicado] = useState(filtroInicial);
  const [pagina, setPagina] = useState(1);
  const hoje = hojeIso();
  const periodo = resolverPeriodo(aplicado, hoje);
  const dataBase = periodo.fim || hoje;
  const busca = aplicado.busca.trim().toLocaleLowerCase("pt-BR");
  const chave = `${topico ?? "hub"}|${periodo.inicio}|${periodo.fim}|${aplicado.advogado}|${aplicado.condominio}|${aplicado.atendente}|${aplicado.respondeu}|${aplicado.motivo}|${aplicado.canal}|${busca}`;

  function abrir(id: TopicoId) {
    setPagina(1);
    router.push(`/relatorios?topico=${id}`);
  }

  function voltar() {
    setPagina(1);
    router.push("/relatorios");
  }

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

  function combinaAtendimento(item: Atendimento, exigirPeriodo: boolean) {
    if (exigirPeriodo && !dentro(item.dataHora, periodo.inicio, periodo.fim)) return false;
    const condominio = condominioDaUnidade(item.unidadeId);
    if (!combinaCarteira(condominio)) return false;
    if (aplicado.atendente !== "todos" && String(item.usuarioId) !== aplicado.atendente) return false;
    if (aplicado.respondeu !== "todos" && item.respondeu !== aplicado.respondeu) return false;
    if (aplicado.motivo !== "todos" && item.motivo !== aplicado.motivo) return false;
    if (aplicado.canal !== "todos" && item.canal !== aplicado.canal) return false;
    const texto = `${item.assunto} ${item.descricao} ${item.motivo} ${nomeUnidade(item.unidadeId)} ${condominio?.nome ?? ""}`.toLocaleLowerCase("pt-BR");
    return busca.length === 0 || texto.includes(busca);
  }

  const atendimentos = cadastros.atendimentos.filter((item) => combinaAtendimento(item, true));
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
  const serie = [...serieMapa.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dia, quantidade]) => ({
      nome: serieLonga ? mesCurto(dia) : diaCurto(dia),
      quantidade,
    }));
  const pico = [...serie].sort((a, b) => b.quantidade - a.quantidade)[0];

  const porCondominio = agruparContagem(atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.nome ?? "—"));
  const porAtendente = agruparContagem(atendimentos.map((item) => nomeUsuario(item.usuarioId)));
  const porAdvogado = agruparContagem(atendimentos.map((item) => condominioDaUnidade(item.unidadeId)?.advogado ?? "—"));
  const porMeio = agruparContagem(atendimentos.map((item) => item.canal || "—"));
  const porMotivo = agruparContagem(atendimentos.filter((item) => item.respondeu === "Sim").map((item) => item.motivo || "Não informou o motivo"));
  const respondeuGrupo = agruparContagem(atendimentos.map((item) => (item.respondeu === "Sim" || item.respondeu === "Não" ? item.respondeu : "—")));
  const meios = porMeio.map((linha) => {
    const itens = atendimentos.filter((item) => (item.canal || "—") === linha.nome);
    const sim = itens.filter((item) => item.respondeu === "Sim").length;
    return { ...linha, resposta: itens.length ? (sim / itens.length) * 100 : 0 };
  });
  const melhorMeio = [...meios].sort((a, b) => b.resposta - a.resposta || b.quantidade - a.quantidade)[0];

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

  const equipe = porAtendente.map((linha) => {
    const itens = atendimentos.filter((item) => nomeUsuario(item.usuarioId) === linha.nome);
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

  const retornos = cadastros.atendimentos
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

  const cruzamento = [...new Set(atendimentos.map((item) => item.unidadeId))].map((unidadeId) => {
    const contatos = atendimentos.filter((item) => item.unidadeId === unidadeId);
    const meses = new Set(contatos.map((item) => mesSeguinte(item.dataHora)));
    const pagamento = cadastros.debitos.find(
      (debito) => String(debito.unidadeId) === unidadeId && debito.status === "Pago" && debito.dataPagamento && meses.has(debito.dataPagamento.slice(0, 7)),
    );
    const acordo = cadastros.debitos.find(
      (debito) => String(debito.unidadeId) === unidadeId && grupoDebito(debito.descricao) === "Acordo" && meses.has(debito.dataVencimento.slice(0, 7)),
    );
    return {
      unidade: nomeUnidade(unidadeId),
      condominio: condominioDaUnidade(unidadeId)?.nome ?? "—",
      contatos: contatos.length,
      resultado: pagamento ? "Pagou no mês seguinte" : acordo ? "Acordo no mês seguinte" : "Sem resultado no mês seguinte",
    };
  });
  const comResultado = cruzamento.filter((linha) => linha.resultado !== "Sem resultado no mês seguinte").length;

  const debitos = cadastros.debitos.filter((item) => {
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
  const unidadesCarteira = cadastros.unidades.filter((item) => combinaCarteira(cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId))).length;
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

  const porAdvogadoDebito = advogados
    .map((advogado) => {
      const itens = debitos.filter((item) => cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId)?.advogado === advogado);
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

  const evolucao = [...new Set(debitos.map((item) => item.referencia || "—"))]
    .map((referencia) => ({ referencia, valor: somar(debitos.filter((item) => (item.referencia || "—") === referencia)) }))
    .sort((a, b) => a.referencia.localeCompare(b.referencia, "pt-BR"));

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

  const vazio = <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Nenhum registro no recorte" description="Ajuste o período ou os filtros." />;

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
    const condominio = cadastros.condominios.find((atualItem) => atualItem.id === item.condominioId);
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
    ];
  }

  function exportar() {
    if (!topico) return;
    const planilhas: Record<TopicoId, { arquivo: string; colunas: string[]; linhas: string[][] }> = {
      cobranca: {
        arquivo: "cobranca-da-equipe.xls",
        colunas: ["Data", "Condomínio", "Unidade", "Atendente", "Advogado", "Meio", "Respondeu", "Motivo", "Assunto", "Descrição", "Retorno", "Próxima ação", "Situação"],
        linhas: listaAtendimentos.map(linhaAtendimento),
      },
      condominios: {
        arquivo: "condominios-advogados.xls",
        colunas: ["Condomínio", "Atendimentos", "Resposta", "Unidades", "Último contato"],
        linhas: resumoCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta), String(linha.unidades), linha.ultimo]),
      },
      retornos: {
        arquivo: "retornos.xls",
        colunas: ["Quando", "Unidade", "Atendente", "Ação", "Situação"],
        linhas: retornos.map((item) => [formatarData(item.dataProximaAcao), nomeUnidade(item.unidadeId), nomeUsuario(item.usuarioId), item.proximaAcao || "—", rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"]]),
      },
      resultado: {
        arquivo: "resultado.xls",
        colunas: ["Condomínio", "Unidade", "Contatos", "Resultado"],
        linhas: cruzamento.map((linha) => [linha.condominio, linha.unidade, String(linha.contatos), linha.resultado]),
      },
      carteira: {
        arquivo: "carteira.xls",
        colunas: ["Condomínio", "Advogado", "Unidade", "Referência", "Descrição", "Grupo", "Vencimento", "Dias", "Original", "Atualizado", "Situação"],
        linhas: listaDebitos.map(linhaDebito),
      },
      composicao: {
        arquivo: "composicao.xls",
        colunas: ["Grupo", "Atualizado", "Até 60 dias", "Acima de 60 dias", "Participação"],
        linhas: porGrupo.map((linha) => [linha.nome, dinheiro(linha.valor), dinheiro(linha.ate), dinheiro(linha.acima), percentual(linha.percentual)]),
      },
      alertas: {
        arquivo: "alertas.xls",
        colunas: ["Alerta", "Unidade", "Descrição", "Dias", "Atualizado"],
        linhas: alertas.map((linha) => [linha.tipo, nomeUnidade(linha.item.unidadeId), linha.item.descricao, String(diasDeAtraso(linha.item.dataVencimento, dataBase)), dinheiro(Number(linha.item.valorAtualizado) || 0)]),
      },
    };
    const planilha = planilhas[topico];
    exportarExcel(planilha.arquivo, planilha.colunas, planilha.linhas);
  }

  function imprimir() {
    if (!topico || !atual) return;
    const secoes: Record<TopicoId, Array<{ titulo: string; colunas: string[]; linhas: string[][] }>> = {
      cobranca: [
        { titulo: serieLonga ? "Por mês" : "Por dia", colunas: ["Período", "Quantidade"], linhas: serie.map((linha) => [linha.nome, String(linha.quantidade)]) },
        { titulo: "Motivos", colunas: ["Motivo", "Quantidade", "Percentual"], linhas: porMotivo.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
        { titulo: "Meios", colunas: ["Meio", "Atendimentos", "Resposta"], linhas: meios.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta)]) },
        { titulo: "Equipe", colunas: ["Atendente", "Atendimentos", "Resposta"], linhas: equipe.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta)]) },
      ],
      condominios: [
        { titulo: "Condomínios", colunas: ["Condomínio", "Atendimentos", "Resposta", "Unidades", "Último"], linhas: resumoCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta), String(linha.unidades), linha.ultimo]) },
        { titulo: "Advogados", colunas: ["Advogado", "Atendimentos", "Percentual"], linhas: porAdvogado.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.percentual)]) },
      ],
      retornos: [
        { titulo: "Agenda", colunas: ["Quando", "Unidade", "Atendente", "Ação", "Situação"], linhas: retornos.map((item) => [formatarData(item.dataProximaAcao), nomeUnidade(item.unidadeId), nomeUsuario(item.usuarioId), item.proximaAcao || "—", rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"]]) },
      ],
      resultado: [
        { titulo: "Resultado", colunas: ["Condomínio", "Unidade", "Contatos", "Resultado"], linhas: cruzamento.map((linha) => [linha.condominio, linha.unidade, String(linha.contatos), linha.resultado]) },
      ],
      carteira: [
        { titulo: "Totais", colunas: ["Indicador", "Valor"], linhas: [["Original", dinheiro(totalOriginal)], ["Atualizado", dinheiro(totalAberto)], ["Até 60 dias", dinheiro(valorAte60)], ["Acima de 60 dias", dinheiro(valorAcima60)], ["Unidades", percentual(percentualUnidades)]] },
        { titulo: "Ranking", colunas: ["Condomínio", "Em aberto", "Unidades", "% unidades"], linhas: rankingCondominio.map((linha) => [linha.nome, dinheiro(linha.valor), `${linha.devedoras}/${linha.unidades}`, percentual(linha.percentualUnidades)]) },
        { titulo: "Advogados", colunas: ["Advogado", "Em aberto", "Até 60", "Acima de 60"], linhas: porAdvogadoDebito.map((linha) => [linha.nome, dinheiro(linha.valor), dinheiro(linha.ate), dinheiro(linha.acima)]) },
      ],
      composicao: [
        { titulo: "Grupos", colunas: ["Grupo", "Atualizado", "Até 60", "Acima de 60", "Participação"], linhas: porGrupo.map((linha) => [linha.nome, dinheiro(linha.valor), dinheiro(linha.ate), dinheiro(linha.acima), percentual(linha.percentual)]) },
        { titulo: "Faixas", colunas: ["Faixa", "Em aberto", "Participação"], linhas: porFaixa.map((linha) => [linha.nome, dinheiro(linha.valor), percentual(linha.percentual)]) },
        { titulo: "Competência", colunas: ["Referência", "Em aberto"], linhas: evolucao.map((linha) => [linha.referencia, dinheiro(linha.valor)]) },
      ],
      alertas: [
        { titulo: "Alertas", colunas: ["Alerta", "Unidade", "Dias", "Atualizado"], linhas: alertas.map((linha) => [linha.tipo, nomeUnidade(linha.item.unidadeId), String(diasDeAtraso(linha.item.dataVencimento, dataBase)), dinheiro(Number(linha.item.valorAtualizado) || 0)]) },
        { titulo: "Maiores devedores", colunas: ["Unidade", "Condomínio", "Dias", "Em aberto"], linhas: maiores.map((linha) => [linha.unidade, linha.condominio, String(linha.dias), dinheiro(linha.valor)]) },
      ],
    };
    const abriu = exportarPdf(atual.titulo, `${atual.id}.html`, secoes[topico]);
    if (!abriu) {
      toast({ variant: "info", title: "Relatório baixado", description: "Abra o arquivo e use imprimir para salvar em PDF." });
    }
  }

  const encargos = Math.max(0, totalAberto - totalOriginal);

  const camposFiltro = [
    {
      id: "periodo",
      label: "Período",
      type: "period" as const,
      value: { preset: filtro.preset, de: filtro.de, ate: filtro.ate },
      onChange: (periodoAtual: { preset: PeriodPreset; de: string; ate: string }) => setFiltro((atualFiltro) => ({ ...atualFiltro, ...periodoAtual })),
    },
    {
      id: "advogado",
      label: "Advogado",
      value: filtro.advogado,
      onChange: (advogado: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, advogado })),
      options: [{ value: "todos", label: "Todos" }, ...advogados.map((item) => ({ value: item, label: item }))],
    },
    {
      id: "condominio",
      label: "Condomínio",
      value: filtro.condominio,
      onChange: (condominio: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, condominio })),
      options: [{ value: "todos", label: "Todos" }, ...cadastros.condominios.map((item) => ({ value: String(item.id), label: item.nome }))],
    },
    {
      id: "atendente",
      label: "Atendente",
      value: filtro.atendente,
      onChange: (atendente: string) => setFiltro((atualFiltro) => ({ ...atualFiltro, atendente })),
      options: [{ value: "todos", label: "Todos" }, ...cadastros.usuarios.map((item) => ({ value: String(item.id), label: item.nome }))],
    },
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

  let corpo: ReactNode = null;
  if (topico === "cobranca") {
    corpo = (
      <>
        {atendimentos.length > 0 ? (
          <Leitura>
            {pico ? `O dia mais movimentado foi ${pico.nome}, com ${pico.quantidade} atendimento${pico.quantidade === 1 ? "" : "s"}. ` : ""}
            {percentual(taxaResposta)} dos contatos tiveram resposta.
            {melhorMeio ? ` ${melhorMeio.nome} responde melhor: ${percentual(melhorMeio.resposta)}.` : ""}
            {porMotivo[0] ? ` Motivo mais citado: ${porMotivo[0].nome}.` : ""}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-4">
          <Metrica valor={String(atendimentos.length)} rotulo="atendimentos" destaque />
          <Metrica valor={percentual(taxaResposta)} rotulo="responderam" />
          <Metrica valor={String(unidadesContatadas)} rotulo="unidades contatadas" />
          <Metrica valor={String(retornosPeriodo.length)} rotulo="retornos ainda abertos" />
        </div>
        <Painel titulo={serieLonga ? "Atendimentos por mês" : "Atendimentos por dia"} nota="A coluna dourada é o pico. Acima de dois meses, o gráfico passa a ser mensal.">
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
        </Painel>
        <Grade>
          <Painel titulo="Quem respondeu">
            <GraficoRosca
              chave={`${chave}-resposta`}
              vazio={vazio}
              centro={percentual(taxaResposta)}
              legenda="efetivo"
              fatias={respondeuGrupo.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`,
                tom: linha.nome === "Sim" ? "settled" : linha.nome === "Não" ? "pending" : "mist",
              }))}
            />
          </Painel>
          <Painel titulo="Resposta por meio" nota="A barra é o volume. O percentual é de quem respondeu naquele meio.">
            <GraficoBarras
              chave={`${chave}-meio`}
              vazio={vazio}
              itens={meios.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${linha.quantidade} · ${percentual(linha.resposta)}`,
                tom: linha.resposta >= 50 ? "settled" : "pending",
              }))}
            />
          </Painel>
        </Grade>
        <Grade>
          <Painel titulo="Motivo da pendência" nota="Só entram conversas em que o condômino respondeu.">
            <GraficoRosca
              chave={`${chave}-motivos`}
              vazio={vazio}
              centro={porMotivo[0] ? percentual(porMotivo[0].percentual) : "—"}
              legenda="principal"
              fatias={porMotivo.map((linha, indice) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`, tom: tomPorIndice(indice) }))}
            />
          </Painel>
          <Painel titulo="Volume da equipe">
            <GraficoBarras
              chave={`${chave}-equipe`}
              vazio={vazio}
              itens={equipe.map((linha) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${linha.quantidade} · ${percentual(linha.resposta)} resposta` }))}
            />
          </Painel>
        </Grade>
        <TabelaTexto
          rotulo="Registros do período"
          colunas={["Data", "Condomínio", "Unidade", "Atendente", "Meio", "Respondeu", "Motivo"]}
          linhas={listaAtendimentos.map((item) => [formatarData(item.dataHora), condominioDaUnidade(item.unidadeId)?.nome ?? "—", nomeUnidade(item.unidadeId), nomeUsuario(item.usuarioId), item.canal, item.respondeu || "—", item.motivo || "—"])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  } else if (topico === "condominios") {
    corpo = (
      <>
        {resumoCondominio[0] ? <Leitura>{`${resumoCondominio[0].nome} recebeu mais contatos (${resumoCondominio[0].quantidade}), com ${percentual(resumoCondominio[0].resposta)} de resposta.`}</Leitura> : null}
        <Grade>
          <Painel titulo="Atendimentos por condomínio">
            <GraficoBarras chave={chave} vazio={vazio} itens={resumoCondominio.map((linha) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${percentual(linha.resposta)} de resposta` }))} />
          </Painel>
          <Painel titulo="Atendimentos por advogado" nota="Na palitagem os condomínios ficam juntos. A divisão por advogado aparece neste relatório.">
            <GraficoBarras chave={`${chave}-adv`} vazio={vazio} itens={porAdvogado.map((linha, indice) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: `${linha.quantidade} · ${percentual(linha.percentual)}`, tom: tomPorIndice(indice) }))} />
          </Painel>
        </Grade>
        <TabelaTexto
          rotulo="Resumo por condomínio"
          colunas={["Condomínio", "Atendimentos", "Resposta", "Unidades", "Último contato"]}
          linhas={resumoCondominio.map((linha) => [linha.nome, String(linha.quantidade), percentual(linha.resposta), String(linha.unidades), linha.ultimo])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  } else if (topico === "retornos") {
    const porSituacao = agruparContagem(retornos.map((item) => rotuloRetorno[situacaoRetorno(item.dataProximaAcao) || "agendado"]));
    corpo = (
      <>
        {retornos.length > 0 ? (
          <Leitura>
            {retornosAtrasados > 0 ? `${retornosAtrasados} retorno${retornosAtrasados === 1 ? "" : "s"} já passou da data combinada. ` : "Nenhum retorno atrasado. "}
            Hoje há {retornosHoje}.
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <Metrica valor={String(retornosAtrasados)} rotulo="atrasados" destaque />
          <Metrica valor={String(retornosHoje)} rotulo="para hoje" />
          <Metrica valor={String(retornos.length)} rotulo="na agenda" />
        </div>
        <Grade>
          <Painel titulo="Situação da agenda" nota="Atrasados entram sempre. A semana que vem permanece visível, mesmo fora do período.">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={String(retornos.length)}
              legenda="retornos"
              fatias={porSituacao.map((linha) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: String(linha.quantidade),
                tom: linha.nome === "Atrasado" ? "critical" : linha.nome === "Hoje" ? "pending" : linha.nome === "Próximos 7 dias" ? "brass" : "navy",
              }))}
            />
          </Painel>
          <Painel titulo="Por atendente">
            <GraficoBarras
              chave={`${chave}-equipe`}
              vazio={vazio}
              itens={agruparContagem(retornos.map((item) => nomeUsuario(item.usuarioId))).map((linha) => ({ nome: linha.nome, valor: linha.quantidade, detalhe: String(linha.quantidade) }))}
            />
          </Painel>
        </Grade>
        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm text-on-surface">Agenda</h2>
          <Table aria-label="Retornos">
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
                retornos.slice((pagina - 1) * PAGE_SIZE, pagina * PAGE_SIZE).map((item) => {
                  const situacao = situacaoRetorno(item.dataProximaAcao);
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatarData(item.dataProximaAcao)}</TableCell>
                      <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                      <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
                      <TableCell>{item.proximaAcao || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={situacao === "atrasado" ? "error" : situacao === "hoje" ? "secondary" : "primary"}>{situacao ? rotuloRetorno[situacao] : "—"}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          {retornos.length > PAGE_SIZE ? <Pagination page={pagina} total={retornos.length} onPageChange={setPagina} /> : null}
        </section>
      </>
    );
  } else if (topico === "resultado") {
    const gruposResultado = agruparContagem(cruzamento.map((linha) => linha.resultado));
    corpo = (
      <>
        {cruzamento.length > 0 ? (
          <Leitura>
            {comResultado === 0
              ? `Nenhuma das ${cruzamento.length} unidades contatadas pagou ou fez acordo no mês seguinte.`
              : `${comResultado} de ${cruzamento.length} unidades contatadas pagou ou fez acordo no mês seguinte.`}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <Metrica valor={String(cruzamento.length)} rotulo="unidades contatadas" />
          <Metrica valor={String(cruzamento.filter((linha) => linha.resultado.startsWith("Pagou")).length)} rotulo="pagaram" destaque />
          <Metrica valor={String(cruzamento.filter((linha) => linha.resultado.startsWith("Acordo")).length)} rotulo="fizeram acordo" />
        </div>
        <Grade>
          <Painel titulo="O que aconteceu no mês seguinte" nota="Pagamento usa a data da quitação. Acordo usa o vencimento da parcela classificada como acordo.">
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
          </Painel>
          <Painel titulo="Contatos até o resultado">
            <GraficoBarras
              chave={`${chave}-unidades`}
              vazio={vazio}
              itens={cruzamento.map((linha) => ({
                nome: `${linha.unidade} · ${linha.condominio}`,
                valor: linha.contatos,
                detalhe: linha.resultado,
                tom: linha.resultado.startsWith("Pagou") ? "settled" : linha.resultado.startsWith("Acordo") ? "brass" : "mist",
              }))}
            />
          </Painel>
        </Grade>
      </>
    );
  } else if (topico === "carteira") {
    corpo = (
      <>
        {totalAberto > 0 ? (
          <Leitura>
            {percentual(parteJuridica)} do aberto já passou de {LIMITE_AMIGAVEL_DIAS} dias. Encargos somam {dinheiro(encargos)} sobre o valor original. Data-base {formatarData(dataBase)}.
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <Metrica valor={dinheiro(totalAberto)} rotulo="valor atualizado" destaque />
          <Metrica valor={dinheiro(valorAte60)} rotulo="até 60 dias" />
          <Metrica valor={dinheiro(valorAcima60)} rotulo="acima de 60 dias" />
        </div>
        <Grade>
          <Painel titulo="Fase amigável e fase jurídica" nota="O percentual sobre o valor emitido depende do total emitido no período, que a importação ainda não traz.">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={percentual(parteJuridica)}
              legenda="jurídico"
              fatias={[
                { nome: "Até 60 dias", valor: valorAte60, detalhe: dinheiro(valorAte60), tom: "brass" },
                { nome: "Acima de 60 dias", valor: valorAcima60, detalhe: dinheiro(valorAcima60), tom: "navy" },
              ]}
            />
          </Painel>
          <Painel titulo="Original, encargos e atualizado">
            <GraficoBarras
              chave={`${chave}-valores`}
              vazio={vazio}
              itens={[
                { nome: "Valor original", valor: totalOriginal, detalhe: dinheiro(totalOriginal), tom: "mist" },
                { nome: "Encargos", valor: encargos, detalhe: dinheiro(encargos), tom: "brass" },
                { nome: "Valor atualizado", valor: totalAberto, detalhe: dinheiro(totalAberto), tom: "navy" },
              ]}
            />
          </Painel>
        </Grade>
        <Grade>
          <Painel titulo="Ranking de condomínios">
            <GraficoBarras chave={`${chave}-ranking`} vazio={vazio} itens={rankingCondominio.map((linha) => ({ nome: linha.nome, valor: linha.valor, detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentualUnidades)} das unidades` }))} />
          </Painel>
          <Painel titulo="Por advogado responsável">
            <GraficoEmpilhado chave={`${chave}-adv`} vazio={vazio} itens={porAdvogadoDebito.map((linha) => ({ nome: linha.nome, ate: linha.ate, acima: linha.acima, detalhe: dinheiro(linha.valor) }))} />
          </Painel>
        </Grade>
      </>
    );
  } else if (topico === "composicao") {
    corpo = (
      <>
        {grupoLider && grupoLider.valor > 0 ? (
          <Leitura>
            {grupoLider.nome} concentra {percentual(grupoLider.percentual)} do aberto. {faixaLider && faixaLider.valor > 0 ? `A faixa mais pesada é ${faixaLider.nome.toLocaleLowerCase("pt-BR")} (${percentual(faixaLider.percentual)}).` : ""} Taxa extra fica separada da cota: a obrigação e a prestação de contas são outras.
          </Leitura>
        ) : null}
        <Grade>
          <Painel titulo="De que tipo é o débito">
            <GraficoRosca
              chave={chave}
              vazio={vazio}
              centro={grupoLider && grupoLider.valor > 0 ? percentual(grupoLider.percentual) : "—"}
              legenda="maior grupo"
              fatias={porGrupo.filter((linha) => linha.valor > 0).map((linha, indice) => ({ nome: linha.nome, valor: linha.valor, detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentual)}`, tom: tomPorIndice(indice) }))}
            />
          </Painel>
          <Painel titulo="Cada grupo, em fase amigável e jurídica">
            <GraficoEmpilhado chave={`${chave}-fase`} vazio={vazio} itens={porGrupo.filter((linha) => linha.valor > 0).map((linha) => ({ nome: linha.nome, ate: linha.ate, acima: linha.acima, detalhe: dinheiro(linha.valor) }))} />
          </Painel>
        </Grade>
        <Grade>
          <Painel titulo="Faixas de atraso">
            <GraficoColunas chave={`${chave}-faixas`} vazio={vazio} itens={porFaixa.map((linha) => ({ nome: linha.nome, valor: linha.valor, rotulo: percentual(linha.percentual), tom: faixaLider && linha.nome === faixaLider.nome ? "brass" : "navy" }))} />
          </Painel>
          <Painel titulo="Competência das cobranças em aberto" nota="Cada ponto é o mês da cobrança que continua em aberto. Ainda não há fotografia salva mês a mês.">
            <GraficoLinha chave={`${chave}-linha`} vazio={vazio} itens={evolucao.map((linha) => ({ nome: linha.referencia, valor: linha.valor, rotulo: dinheiro(linha.valor) }))} />
          </Painel>
        </Grade>
      </>
    );
  } else if (topico === "alertas") {
    corpo = (
      <>
        {alertas.length > 0 || maiores[0] ? (
          <Leitura>
            {prescricao.length > 0 ? `${prescricao.length} cobrança${prescricao.length === 1 ? "" : "s"} está perto de 5 anos. ` : "Nenhuma cobrança perto da prescrição. "}
            {maiores[0] ? `A maior devedora é ${maiores[0].unidade}, com ${dinheiro(maiores[0].valor)}.` : ""}
          </Leitura>
        ) : null}
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <Metrica valor={String(prescricao.length)} rotulo="perto de 5 anos" destaque />
          <Metrica valor={String(acordosQuebrados.length)} rotulo="acordos em atraso" />
          <Metrica valor={String(passaram60.length)} rotulo="passaram de 60 dias no mês" />
        </div>
        <Grade>
          <Painel titulo="O que olhar primeiro">
            <GraficoBarras
              chave={chave}
              vazio={vazio}
              itens={[
                { nome: "Perto de 5 anos", valor: prescricao.length, detalhe: String(prescricao.length), tom: "critical" },
                { nome: "Acordo descumprido", valor: acordosQuebrados.length, detalhe: String(acordosQuebrados.length), tom: "pending" },
                { nome: "Passou de 60 dias no mês", valor: passaram60.length, detalhe: String(passaram60.length), tom: "brass" },
              ]}
            />
          </Painel>
          <Painel titulo="Dez maiores devedores">
            <GraficoBarras
              chave={`${chave}-devedores`}
              vazio={vazio}
              itens={maiores.map((linha) => ({ nome: `${linha.unidade} · ${linha.condominio}`, valor: linha.valor, detalhe: `${dinheiro(linha.valor)} · ${linha.dias} dias` }))}
            />
          </Painel>
        </Grade>
        <TabelaTexto
          rotulo="Alertas"
          colunas={["Alerta", "Unidade", "Descrição", "Dias", "Atualizado"]}
          linhas={alertas.map((linha) => [linha.tipo, nomeUnidade(linha.item.unidadeId), linha.item.descricao, String(diasDeAtraso(linha.item.dataVencimento, dataBase)), dinheiro(Number(linha.item.valorAtualizado) || 0)])}
          pagina={pagina}
          onPagina={setPagina}
          vazio={vazio}
        />
      </>
    );
  }

  return (
    <WorkspaceShell>
      <PageHeader
        title={atual?.titulo ?? "Relatórios"}
        description={atual?.descricao ?? "Escolha um relatório. Ele abre com os gráficos e a leitura do período."}
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Relatórios", href: topico ? "/relatorios" : undefined }, ...(atual ? [{ label: atual.titulo }] : [])]}
      />
      <PageContent>
        {topico ? (
          <>
            <FilterBar
              searchValue={filtro.busca}
              onSearchChange={(buscaAtual) => setFiltro((atualFiltro) => ({ ...atualFiltro, busca: buscaAtual }))}
              searchPlaceholder="Buscar condomínio, unidade ou assunto..."
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
            <div className="flex flex-wrap items-center justify-between gap-sm">
              <Button size="sm" variant="ghost" onClick={voltar}>
                <Icon icon={ArrowLeft} size="sm" />
                Todos os relatórios
              </Button>
              <div className="flex flex-wrap gap-sm">
                <Button size="sm" variant="outline" onClick={exportar}>
                  <Icon icon={FileSpreadsheet} size="sm" />
                  Excel
                </Button>
                <Button size="sm" variant="outline" onClick={imprimir}>
                  <Icon icon={FileText} size="sm" />
                  PDF
                </Button>
              </div>
            </div>
            {corpo}
          </>
        ) : (
          GRUPOS.map((grupo) => (
            <section key={grupo.id} className="flex flex-col gap-md">
              <div className="flex flex-col gap-xs">
                <h2 className="text-headline-sm text-on-surface">{grupo.titulo}</h2>
                <p className="text-body-md text-on-surface-variant">{grupo.texto}</p>
              </div>
              <div className="grid grid-cols-1 items-stretch gap-lg min-[768px]:grid-cols-2 min-[1200px]:grid-cols-3">
                {TOPICOS.filter((item) => item.grupo === grupo.id).map((item) => {
                  const atencao = (item.id === "retornos" && retornosAtrasados > 0) || (item.id === "alertas" && alertas.length > 0);
                  return (
                    <article key={item.id} className="flex h-full flex-col gap-lg rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
                      <div className="flex items-start justify-between gap-md">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-primary-container">
                          <Icon icon={item.icon} size="md" />
                        </span>
                        <Badge variant={atencao ? "error" : item.seloVariante}>{atencao ? "Atenção" : item.selo}</Badge>
                      </div>
                      <div className="flex flex-col gap-xs">
                        <h3 className="text-headline-sm text-on-surface">{item.titulo}</h3>
                        <p className="text-body-sm text-on-surface-variant">{item.descricao}</p>
                      </div>
                      <div className="flex flex-1 flex-col gap-sm">
                        <p className="text-label-sm uppercase text-on-surface-variant">Indicadores</p>
                        <ul className="flex flex-wrap gap-sm">
                          {item.indicadores.map((nome) => (
                            <li key={nome} className="rounded-full border border-border-subtle px-md py-xs text-body-sm text-primary-container">
                              {nome}
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Button className="w-full" onClick={() => abrir(item.id)}>
                        <Icon icon={ArrowUpRight} size="sm" />
                        Acessar relatório
                      </Button>
                    </article>
                  );
                })}
              </div>
            </section>
          ))
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
