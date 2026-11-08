"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Clock, FileText, Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
import { KpiMobileCard } from "@/components/kpi-mobile-card";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  ResponsiveTable,
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileEmpty,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableSortDirection,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EncaminhamentoJuridicoSheet } from "@/components/juridico/encaminhamento-juridico-sheet";
import {
  escopoCondominios,
  formatarData,
  nomeCondominio,
  nomeUnidade,
  opcoesAdvogadosResponsaveis,
  statusEncaminhamentoJuridico,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  Encaminhado: "secondary",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

type SortKey = "encaminhado" | "condominio" | "unidade" | "advogado" | "status" | "documentos";

type DetalheAberto = {
  encaminhamentoId: string;
  unidadeId: number;
  condominioId: number;
  unidade: string;
  condominio: string;
};

function metricValor(valor: number) {
  return String(valor).padStart(2, "0");
}

function tituloEncaminhamentoMobile(item: EncaminhamentoJuridicoDetalhe) {
  return `${nomeCondominio(item.condominioId)} - ${nomeUnidade(item.unidadeId)}`;
}

export default function JuridicoPage() {
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();

  const [encaminhamentos, setEncaminhamentos] = useState<EncaminhamentoJuridicoDetalhe[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("todos");
  const [condominio, setCondominio] = useState("todos");
  const [advogado, setAdvogado] = useState("todos");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("todos");
  const [appliedCondominio, setAppliedCondominio] = useState("todos");
  const [appliedAdvogado, setAppliedAdvogado] = useState("todos");

  const [sortKey, setSortKey] = useState<SortKey>("encaminhado");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [detalhe, setDetalhe] = useState<DetalheAberto | null>(null);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, sessao?.userId),
    [cadastros, sessao?.userId],
  );

  const advogadosFiltro = useMemo(() => opcoesAdvogadosResponsaveis(cadastros), [cadastros]);

  const carregar = useCallback(async () => {
    if (!sessao) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroCarregamento("");
    try {
      const params = new URLSearchParams();
      if (appliedStatus !== "todos") params.set("status", appliedStatus);
      if (appliedCondominio !== "todos") params.set("condominioId", appliedCondominio);
      if (appliedAdvogado !== "todos") params.set("advogado", appliedAdvogado);
      const queryString = params.toString();
      const response = await fetch(
        `/api/juridico/encaminhamentos${queryString ? `?${queryString}` : ""}`,
        { credentials: "same-origin" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErroCarregamento(body?.error ?? "Não foi possível carregar os encaminhamentos.");
        setEncaminhamentos([]);
        return;
      }
      const payload = (await response.json()) as { encaminhamentos?: EncaminhamentoJuridicoDetalhe[] };
      setEncaminhamentos(payload.encaminhamentos ?? []);
    } catch {
      setErroCarregamento("Não foi possível carregar os encaminhamentos.");
      setEncaminhamentos([]);
    } finally {
      setCarregando(false);
    }
  }, [appliedAdvogado, appliedCondominio, appliedStatus, sessao]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = encaminhamentos
    .filter((item) => {
      if (!query) return true;
      const unidade = nomeUnidade(item.unidadeId).toLocaleLowerCase("pt-BR");
      const condominioNome = nomeCondominio(item.condominioId).toLocaleLowerCase("pt-BR");
      const haystack = `${unidade} ${condominioNome} ${item.advogadoResponsavel} ${item.status}`.toLocaleLowerCase(
        "pt-BR",
      );
      return haystack.includes(query);
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left =
        sortKey === "condominio"
          ? nomeCondominio(a.condominioId)
          : sortKey === "unidade"
            ? nomeUnidade(a.unidadeId)
            : sortKey === "advogado"
              ? a.advogadoResponsavel
              : sortKey === "status"
                ? a.status
                : sortKey === "documentos"
                  ? String(a.documentos?.length ?? 0).padStart(5, "0")
                  : a.encaminhadoEm;
      const right =
        sortKey === "condominio"
          ? nomeCondominio(b.condominioId)
          : sortKey === "unidade"
            ? nomeUnidade(b.unidadeId)
            : sortKey === "advogado"
              ? b.advogadoResponsavel
              : sortKey === "status"
                ? b.status
                : sortKey === "documentos"
                  ? String(b.documentos?.length ?? 0).padStart(5, "0")
                  : b.encaminhadoEm;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const emAnalise = visible.filter((item) => item.status === "Em análise").length;
  const comDocumentos = visible.filter((item) => (item.documentos?.length ?? 0) > 0).length;

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "encaminhado" ? "desc" : "asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("encaminhado");
    setSortDirection("desc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedStatus(status);
    setAppliedCondominio(condominio);
    setAppliedAdvogado(advogado);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setStatus("todos");
    setCondominio("todos");
    setAdvogado("todos");
    setAppliedSearch("");
    setAppliedStatus("todos");
    setAppliedCondominio("todos");
    setAppliedAdvogado("todos");
    setPage(1);
  }

  function abrirDetalhe(item: EncaminhamentoJuridicoDetalhe) {
    setDetalhe({
      encaminhamentoId: item.id,
      unidadeId: item.unidadeId,
      condominioId: item.condominioId,
      unidade: nomeUnidade(item.unidadeId),
      condominio: nomeCondominio(item.condominioId),
    });
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={Scale} size="lg" className="text-on-surface-variant" />}
      title={
        encaminhamentos.length === 0 && !carregando
          ? "Nenhum encaminhamento"
          : "Nenhum encaminhamento encontrado"
      }
      description={
        encaminhamentos.length === 0 && !carregando
          ? pode("juridico", "criar")
            ? "Encaminhe casos a partir da fila de cobranças ou do histórico da unidade."
            : "Não há casos no seu escopo no momento."
          : "Ajuste a busca ou os filtros de status, condomínio e advogado."
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Encaminhamentos jurídicos" showExport={false}>
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead
            sortable
            sortDirection={directionFor("encaminhado")}
            onSort={() => handleSort("encaminhado")}
          >
            Encaminhado
          </TableHead>
          <TableHead
            sortable
            sortDirection={directionFor("condominio")}
            onSort={() => handleSort("condominio")}
          >
            Condomínio
          </TableHead>
          <TableHead sortable sortDirection={directionFor("unidade")} onSort={() => handleSort("unidade")}>
            Unidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("advogado")} onSort={() => handleSort("advogado")}>
            Advogado
          </TableHead>
          <TableHead sortable sortDirection={directionFor("status")} onSort={() => handleSort("status")}>
            Status
          </TableHead>
          <TableHead
            sortable
            sortDirection={directionFor("documentos")}
            onSort={() => handleSort("documentos")}
            align="right"
          >
            Documentos
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow
              key={item.id}
              className="cursor-pointer"
              onClick={() => abrirDetalhe(item)}
            >
              <TableCell className="font-medium">{formatarData(item.encaminhadoEm)}</TableCell>
              <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
              <TableCell>{nomeUnidade(item.unidadeId)}</TableCell>
              <TableCell>{item.advogadoResponsavel}</TableCell>
              <TableCell>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </TableCell>
              <TableCell align="right" className="tabular-nums">
                {item.documentos?.length ?? 0}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  const mobileTable =
    visible.length === 0 ? (
      <TableMobileEmpty>{emptyState}</TableMobileEmpty>
    ) : (
      <TableMobileList aria-label="Encaminhamentos jurídicos">
        {pageRows.map((item, index) => (
          <TableMobileCard key={item.id} className="cursor-pointer" onClick={() => abrirDetalhe(item)}>
            <TableMobileCardHeader>
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-on-surface-variant"
                aria-hidden="true"
              >
                <Icon icon={Scale} size="sm" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-x-sm gap-y-xs">
                  <TableMobileTitle className="min-w-0 flex-1 text-body-md font-semibold leading-snug">
                    {tituloEncaminhamentoMobile(item)}
                  </TableMobileTitle>
                  <span className="shrink-0 rounded-full border border-border-subtle bg-surface-subtle px-2 py-0.5 text-body-sm tabular-nums text-on-surface-variant">
                    {index + 1 + (currentPage - 1) * PAGE_SIZE} de {visible.length}
                  </span>
                </div>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Encaminhado em {formatarData(item.encaminhadoEm)}
                </p>
              </div>
              <span aria-hidden="true" />
            </TableMobileCardHeader>
            <div className="mt-sm flex flex-col gap-sm border-t border-border-subtle/30 pt-sm">
              <div className="flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Advogado</p>
                  <p className="text-body-md font-semibold text-on-surface">{item.advogadoResponsavel}</p>
                </div>
                <Badge variant={badgeStatus[item.status] ?? "secondary"} className="shrink-0">
                  {item.status}
                </Badge>
              </div>
              <div className="grid grid-cols-2 gap-sm text-body-sm">
                <div className="min-w-0">
                  <p className="text-label-sm uppercase text-on-surface-variant">Documentos</p>
                  <p className="text-body-md tabular-nums text-on-surface">{item.documentos?.length ?? 0}</p>
                </div>
                <div className="min-w-0 text-end">
                  <p className="text-label-sm uppercase text-on-surface-variant">Condomínio</p>
                  <p className="truncate text-body-md text-on-surface">{nomeCondominio(item.condominioId)}</p>
                </div>
              </div>
            </div>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Jurídico"
        description="Encaminhamentos jurídicos e acompanhamento pelos advogados."
        className="max-md:py-sm max-md:[&_h1]:leading-tight max-md:[&_p]:leading-snug"
      />
      <PageContent className="max-md:gap-md max-md:py-md">
        {erroCarregamento ? (
          <p className="text-body-sm text-error" role="alert">
            {erroCarregamento}
          </p>
        ) : null}
        {carregando && encaminhamentos.length === 0 ? (
          <p className="text-body-sm text-on-surface-variant">Carregando encaminhamentos…</p>
        ) : null}

        <section aria-label="Resumo jurídico">
          <div className="grid grid-cols-1 gap-sm min-[480px]:grid-cols-3 min-[768px]:hidden">
            <KpiMobileCard
              rotulo="Encaminhamentos"
              valor={carregando ? "—" : metricValor(visible.length)}
              icon={Scale}
              destaque
            />
            <KpiMobileCard
              rotulo="Em análise"
              valor={carregando ? "—" : metricValor(emAnalise)}
              icon={Clock}
            />
            <KpiMobileCard
              rotulo="Com documentos"
              valor={carregando ? "—" : metricValor(comDocumentos)}
              icon={FileText}
            />
          </div>
          <div className="hidden grid-cols-1 gap-md min-[768px]:grid min-[768px]:grid-cols-4">
            <CardMetric
              accent="primary"
              iconClassName="bg-primary-fixed/50 text-primary-container"
              icon={<Icon icon={Scale} size="md" className="text-primary-container" />}
              rotulo="Encaminhamentos"
              valor={metricValor(visible.length)}
            />
            <CardMetric
              accent="brass"
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Clock} size="md" className="text-brass" />}
              rotulo="Em análise"
              valor={metricValor(emAnalise)}
            />
            <CardMetric
              accent="tertiary"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={FileText} size="md" className="text-tertiary-container" />}
              rotulo="Com documentos"
              valor={metricValor(comDocumentos)}
            />
          </div>
        </section>

        <section className="flex flex-col gap-md">
          <h2 className="text-headline-sm text-on-surface">Filtros</h2>
          <FilterBar
            searchValue={search}
            onSearchChange={setSearch}
            searchPlaceholder="Buscar unidade, condomínio ou advogado…"
            onApply={handleApply}
            onClear={handleClear}
            fields={[
              {
                id: "status",
                label: "Status",
                value: status,
                onChange: setStatus,
                options: [
                  { value: "todos", label: "Todos" },
                  ...statusEncaminhamentoJuridico.map((item) => ({ value: item, label: item })),
                ],
              },
              {
                id: "condominio",
                label: "Condomínio",
                value: condominio,
                onChange: setCondominio,
                options: [
                  { value: "todos", label: "Todos" },
                  ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome })),
                ],
              },
              {
                id: "advogado",
                label: "Advogado",
                value: advogado,
                onChange: setAdvogado,
                options: [
                  { value: "todos", label: "Todos" },
                  ...advogadosFiltro.map((item) => ({ value: item, label: item })),
                ],
              },
            ]}
          />
        </section>

        <section className="flex flex-col gap-md">
          <ResponsiveTable desktop={desktopTable} mobile={mobileTable} showExport={false} />
        </section>
        {visible.length > 0 ? (
          <Pagination page={currentPage} total={visible.length} onPageChange={setPage} />
        ) : null}
      </PageContent>

      <EncaminhamentoJuridicoSheet
        encaminhamentoId={detalhe?.encaminhamentoId ?? null}
        unidadeId={detalhe?.unidadeId ?? null}
        condominioId={detalhe?.condominioId ?? null}
        tituloUnidade={detalhe?.unidade}
        tituloCondominio={detalhe?.condominio}
        onClose={() => setDetalhe(null)}
        onSalvo={() => void carregar()}
      />
    </WorkspaceShell>
  );
}
