"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { Eye, ScrollText } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { Icon } from "@/components/icon";
import { PAGE_SIZE, Pagination } from "@/components/pagination";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
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
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableSortDirection,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { acoesAuditoria, formatarData, type Auditoria } from "@/data/catalogo";
import type { PeriodValue } from "@/components/period-input";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import {
  badgeAcaoVariant,
  listaCamposAlterados,
  resumoLinha,
  rotuloAcao,
  rotuloTipoRegistro,
  textoAmigavelDados,
  textoTecnicoFormatado,
} from "@/lib/auditoria/apresentacao";
import { rotuloAutorAuditoria } from "@/lib/auditoria/autor";
import { sincronizarAuditoriaDoServidor } from "@/lib/auditoria/sync-cliente";

type SortKey = "data" | "tipo" | "acao";

const periodoTodos: PeriodValue = { preset: "todos", de: "", ate: "" };

function DetalheCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="whitespace-pre-wrap text-body-md text-on-surface">{value.trim() ? value : "—"}</p>
    </div>
  );
}

export default function AuditoriaPage() {
  const sheetId = useId();
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const auditoria = cadastros.auditoria;
  const [carregando, setCarregando] = useState(true);
  const [erroCarregamento, setErroCarregamento] = useState("");
  const [search, setSearch] = useState("");
  const [entidade, setEntidade] = useState("todas");
  const [acao, setAcao] = useState("todas");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedEntidade, setAppliedEntidade] = useState("todas");
  const [appliedAcao, setAppliedAcao] = useState("todas");
  const [periodo, setPeriodo] = useState<PeriodValue>(periodoTodos);
  const [autorId, setAutorId] = useState("todos");
  const [appliedPeriodo, setAppliedPeriodo] = useState<PeriodValue>(periodoTodos);
  const [appliedAutorId, setAppliedAutorId] = useState("todos");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);
  const [detalheId, setDetalheId] = useState<number | null>(null);
  const [mostrarTecnicos, setMostrarTecnicos] = useState(false);

  const detalhe = detalheId === null ? null : (auditoria.find((item) => item.id === detalheId) ?? null);

  const recarregarAuditoria = useCallback(async () => {
    if (!sessao) {
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErroCarregamento("");
    try {
      const params = new URLSearchParams();
      if (appliedEntidade !== "todas") params.set("entidade", appliedEntidade);
      if (appliedAcao !== "todas") params.set("acao", appliedAcao);
      if (appliedSearch.trim()) params.set("q", appliedSearch.trim());
      if (appliedPeriodo.de.trim()) params.set("dataDe", appliedPeriodo.de.trim());
      if (appliedPeriodo.ate.trim()) params.set("dataAte", appliedPeriodo.ate.trim());
      if (appliedAutorId !== "todos") params.set("usuarioId", appliedAutorId);
      const queryString = params.toString();
      const response = await fetch(`/api/auditoria${queryString ? `?${queryString}` : ""}`, {
        credentials: "same-origin",
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        setErroCarregamento(body?.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      const body = (await response.json()) as { auditoria?: Auditoria[] };
      if (body.auditoria) sincronizarAuditoriaDoServidor(body.auditoria);
    } catch {
      setErroCarregamento("Não foi possível carregar o histórico.");
    } finally {
      setCarregando(false);
    }
  }, [sessao, appliedEntidade, appliedAcao, appliedSearch, appliedPeriodo, appliedAutorId]);

  useEffect(() => {
    void recarregarAuditoria();
  }, [recarregarAuditoria]);

  const opcoesAutores = Array.from(
    new Map(
      cadastros.usuarios.map((usuario) => [
        usuario.id,
        { value: String(usuario.id), label: rotuloAutorAuditoria(usuario.id) },
      ]),
    ).values(),
  ).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

  const entidades = Array.from(new Set(auditoria.map((item) => item.entidade))).sort((a, b) =>
    (rotuloTipoRegistro[a] ?? a).localeCompare(rotuloTipoRegistro[b] ?? b, "pt-BR"),
  );

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = auditoria
    .filter((item) => {
      const haystack = `${item.registroId} ${item.camposAlterados} ${item.dadosAnteriores} ${item.dadosNovos} ${rotuloAutorAuditoria(item.usuarioId)} ${resumoLinha(item)} ${rotuloTipoRegistro[item.entidade] ?? ""}`.toLocaleLowerCase("pt-BR");
      return query.length === 0 || haystack.includes(query);
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left =
        sortKey === "tipo"
          ? (rotuloTipoRegistro[a.entidade] ?? a.entidade)
          : sortKey === "acao"
            ? rotuloAcao(a.acao)
            : a.dataHora;
      const right =
        sortKey === "tipo"
          ? (rotuloTipoRegistro[b.entidade] ?? b.entidade)
          : sortKey === "acao"
            ? rotuloAcao(b.acao)
            : b.dataHora;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const alteracoes = visible.filter((item) => item.acao === "UPDATE").length;
  const inclusoes = visible.filter((item) => item.acao === "INSERT").length;
  const remocoes = visible.filter((item) => item.acao === "DELETE").length;

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  function handleSort(key: SortKey) {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDirection(key === "data" ? "desc" : "asc");
      return;
    }
    if (sortDirection === "asc") {
      setSortDirection("desc");
      return;
    }
    setSortKey("data");
    setSortDirection("desc");
  }

  function handleApply() {
    setAppliedSearch(search);
    setAppliedEntidade(entidade);
    setAppliedAcao(acao);
    setAppliedPeriodo(periodo);
    setAppliedAutorId(autorId);
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setEntidade("todas");
    setAcao("todas");
    setPeriodo(periodoTodos);
    setAutorId("todos");
    setAppliedSearch("");
    setAppliedEntidade("todas");
    setAppliedAcao("todas");
    setAppliedPeriodo(periodoTodos);
    setAppliedAutorId("todos");
    setPage(1);
  }

  function abrirDetalhe(id: number) {
    setMostrarTecnicos(false);
    setDetalheId(id);
  }

  function fecharDetalhe() {
    setDetalheId(null);
    setMostrarTecnicos(false);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={ScrollText} size="lg" />}
      title={auditoria.length === 0 ? "Ainda não há movimentações" : "Nada encontrado com esses filtros"}
      description={
        auditoria.length === 0
          ? "Quando alguém cadastrar, alterar ou remover informações no sistema, o registro aparece aqui."
          : "Tente outra palavra na busca ou mude o tipo de registro ou o que aconteceu."
      }
    />
  );

  const botaoVer = (item: Auditoria) => (
    <button
      type="button"
      aria-label={`Ver o que mudou em ${formatarData(item.dataHora)}`}
      className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-on-surface-variant transition-colors hover:bg-surface-subtle hover:text-on-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
      onClick={() => abrirDetalhe(item.id)}
    >
      <Icon icon={Eye} size="sm" />
    </button>
  );

  const desktopTable = (
    <Table aria-label="Histórico de alterações">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Quando
          </TableHead>
          <TableHead>Quem fez</TableHead>
          <TableHead sortable sortDirection={directionFor("tipo")} onSort={() => handleSort("tipo")}>
            Onde
          </TableHead>
          <TableHead sortable sortDirection={directionFor("acao")} onSort={() => handleSort("acao")}>
            O que aconteceu
          </TableHead>
          <TableHead>Resumo</TableHead>
          <TableHead className="w-14">
            <span className="sr-only">Ver detalhes</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataHora)}</TableCell>
              <TableCell>{rotuloAutorAuditoria(item.usuarioId)}</TableCell>
              <TableCell>{rotuloTipoRegistro[item.entidade] ?? "Outro cadastro"}</TableCell>
              <TableCell>
                <Badge variant={badgeAcaoVariant(item.acao)}>{rotuloAcao(item.acao)}</Badge>
              </TableCell>
              <TableCell className="max-w-[16rem] truncate" title={resumoLinha(item)}>{resumoLinha(item)}</TableCell>
              <TableCell align="center" className="w-14 px-sm">
                <div className="flex justify-center">{botaoVer(item)}</div>
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
      <TableMobileList aria-label="Histórico de alterações">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              {botaoVer(item)}
              <TableMobileTitle>{resumoLinha(item)}</TableMobileTitle>
              <Badge variant={badgeAcaoVariant(item.acao)}>{rotuloAcao(item.acao)}</Badge>
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Quando">{formatarData(item.dataHora)}</TableMobileField>
              <TableMobileField label="Quem fez">{rotuloAutorAuditoria(item.usuarioId)}</TableMobileField>
              <TableMobileField label="Onde">{rotuloTipoRegistro[item.entidade] ?? "Outro cadastro"}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Histórico de alterações"
        description="Veja quem mudou o quê no sistema e o que existia antes, quando a alteração foi feita."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Histórico" }]}
      />
      <PageContent>
        {erroCarregamento ? (
          <p className="mb-md text-body-sm text-error" role="alert">{erroCarregamento}</p>
        ) : null}
        {carregando && auditoria.length === 0 ? (
          <p className="mb-md text-body-sm text-on-surface-variant">Carregando histórico…</p>
        ) : null}
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar por RE, resumo ou palavra-chave..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "periodo",
              label: "Período",
              type: "period",
              value: periodo,
              onChange: setPeriodo,
            },
            {
              id: "autor",
              label: "Quem fez",
              value: autorId,
              onChange: setAutorId,
              options: [{ value: "todos", label: "Todos" }, ...opcoesAutores],
            },
            {
              id: "entidade",
              label: "Tipo de registro",
              value: entidade,
              onChange: setEntidade,
              options: [
                { value: "todas", label: "Todos" },
                ...entidades.map((item) => ({ value: item, label: rotuloTipoRegistro[item] ?? "Outro" })),
              ],
            },
            {
              id: "acao",
              label: "O que aconteceu",
              value: acao,
              onChange: setAcao,
              options: [
                { value: "todas", label: "Tudo" },
                ...acoesAuditoria.map((item) => ({ value: item, label: rotuloAcao(item) })),
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ScrollText} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">na lista</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ScrollText} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(alteracoes).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">alterações</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={ScrollText} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(inclusoes + remocoes).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">cadastros e remoções</p>
          </CardMetric>
        </div>
        <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
        {visible.length > 0 ? <Pagination page={currentPage} total={visible.length} onPageChange={setPage} /> : null}
      </PageContent>

      <Sheet open={detalhe !== null} onOpenChange={(open) => !open && fecharDetalhe()}>
        <SheetContent aria-labelledby={`${sheetId}-titulo`} aria-describedby={`${sheetId}-desc`}>
          {detalhe ? (
            <>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={ScrollText} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${sheetId}-titulo`}>{resumoLinha(detalhe)}</SheetTitle>
                    <SheetDescription id={`${sheetId}-desc`}>
                      {formatarData(detalhe.dataHora)} · feito por {rotuloAutorAuditoria(detalhe.usuarioId)}
                    </SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <SheetBody>
                <SheetPanel variant="tint">
                  <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                    <DetalheCampo label="Quando" value={formatarData(detalhe.dataHora)} />
                    <DetalheCampo label="Quem fez" value={rotuloAutorAuditoria(detalhe.usuarioId)} />
                    <DetalheCampo label="Onde" value={rotuloTipoRegistro[detalhe.entidade] ?? "Outro cadastro"} />
                    <DetalheCampo label="O que aconteceu" value={rotuloAcao(detalhe.acao)} />
                    <DetalheCampo label="Código do item" value={detalhe.registroId ? `#${detalhe.registroId}` : "—"} />
                    <DetalheCampo label="Dados que mudaram" value={listaCamposAlterados(detalhe)} />
                  </div>
                </SheetPanel>
                {detalhe.acao !== "INSERT" ? (
                  <SheetPanel>
                    <DetalheCampo label="Como estava antes" value={textoAmigavelDados(detalhe.dadosAnteriores)} />
                  </SheetPanel>
                ) : null}
                {detalhe.acao !== "DELETE" ? (
                  <SheetPanel>
                    <DetalheCampo
                      label={detalhe.acao === "INSERT" ? "O que foi cadastrado" : "Como ficou depois"}
                      value={textoAmigavelDados(detalhe.dadosNovos)}
                    />
                  </SheetPanel>
                ) : null}
                <SheetPanel className="flex flex-col gap-md">
                  <Button type="button" variant="outline" onClick={() => setMostrarTecnicos((atual) => !atual)}>
                    {mostrarTecnicos ? "Ocultar detalhes técnicos" : "Ver detalhes técnicos"}
                  </Button>
                  {mostrarTecnicos ? (
                    <div className="flex flex-col gap-md rounded-md border border-border-subtle bg-surface-subtle p-md">
                      <DetalheCampo label="Identificador interno do tipo" value={detalhe.entidade} />
                      <DetalheCampo label="Código da ação no sistema" value={detalhe.acao} />
                      <DetalheCampo label="Campos (texto original)" value={detalhe.camposAlterados || "—"} />
                      <div className="flex flex-col gap-xs">
                        <p className="text-label-md text-on-surface-variant">Antes (dados brutos)</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-surface-card p-sm text-body-sm text-on-surface">
                          {textoTecnicoFormatado(detalhe.dadosAnteriores)}
                        </pre>
                      </div>
                      <div className="flex flex-col gap-xs">
                        <p className="text-label-md text-on-surface-variant">Depois (dados brutos)</p>
                        <pre className="max-h-48 overflow-auto rounded-md bg-surface-card p-sm text-body-sm text-on-surface">
                          {textoTecnicoFormatado(detalhe.dadosNovos)}
                        </pre>
                      </div>
                      {detalhe.ip || detalhe.userAgent ? (
                        <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
                          <DetalheCampo label="Endereço de rede (IP)" value={detalhe.ip || "—"} />
                          <DetalheCampo label="Navegador ou aplicativo" value={detalhe.userAgent || "—"} />
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </SheetPanel>
              </SheetBody>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={fecharDetalhe}>
                  Fechar
                </Button>
              </SheetFooter>
            </>
          ) : null}
        </SheetContent>
      </Sheet>
    </WorkspaceShell>
  );
}
