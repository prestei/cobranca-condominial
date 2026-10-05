"use client";

import { useState, useSyncExternalStore } from "react";
import { ScrollText } from "lucide-react";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
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
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableRow,
  type TableSortDirection,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  acoesAuditoria,
  formatarData,
  getCadastros,
  nomeUsuario,
  subscribeCadastros,
} from "@/data/catalogo";

const rotuloEntidade: Record<string, string> = {
  role: "Cargo",
  user: "Colaborador",
  condominium: "Condomínio",
  unit: "Unidade",
  responsible_party: "Responsável",
  unit_responsible_party: "Vínculo",
  debt: "Débito",
  service_ticket: "Atendimento",
  import: "Importação",
  audit_log: "Auditoria",
};

const badgeAcao: Record<string, "primary" | "secondary" | "error"> = {
  INSERT: "primary",
  UPDATE: "secondary",
  DELETE: "error",
};

type SortKey = "data" | "entidade" | "acao";

export default function AuditoriaPage() {
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const auditoria = cadastros.auditoria;
  const [search, setSearch] = useState("");
  const [entidade, setEntidade] = useState("todas");
  const [acao, setAcao] = useState("todas");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedEntidade, setAppliedEntidade] = useState("todas");
  const [appliedAcao, setAppliedAcao] = useState("todas");
  const [sortKey, setSortKey] = useState<SortKey>("data");
  const [sortDirection, setSortDirection] = useState<Exclude<TableSortDirection, "none">>("desc");
  const [page, setPage] = useState(1);

  const entidades = Array.from(new Set(auditoria.map((item) => item.entidade))).sort((a, b) =>
    (rotuloEntidade[a] ?? a).localeCompare(rotuloEntidade[b] ?? b, "pt-BR"),
  );

  const query = appliedSearch.trim().toLocaleLowerCase("pt-BR");
  const visible = auditoria
    .filter((item) => {
      const matchesEntidade = appliedEntidade === "todas" || item.entidade === appliedEntidade;
      const matchesAcao = appliedAcao === "todas" || item.acao === appliedAcao;
      const haystack = `${item.registroId} ${item.camposAlterados} ${item.dadosAnteriores} ${item.dadosNovos} ${nomeUsuario(item.usuarioId)}`.toLocaleLowerCase("pt-BR");
      return matchesEntidade && matchesAcao && (query.length === 0 || haystack.includes(query));
    })
    .sort((a, b) => {
      const factor = sortDirection === "asc" ? 1 : -1;
      const left = sortKey === "entidade" ? a.entidade : sortKey === "acao" ? a.acao : a.dataHora;
      const right = sortKey === "entidade" ? b.entidade : sortKey === "acao" ? b.acao : b.dataHora;
      return left.localeCompare(right, "pt-BR") * factor;
    });

  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageRows = visible.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const alteracoes = visible.filter((item) => item.acao === "UPDATE").length;
  const exclusoes = visible.filter((item) => item.acao === "DELETE").length;

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
    setPage(1);
  }

  function handleClear() {
    setSearch("");
    setEntidade("todas");
    setAcao("todas");
    setAppliedSearch("");
    setAppliedEntidade("todas");
    setAppliedAcao("todas");
    setPage(1);
  }

  const emptyState = (
    <EmptyState
      icon={<Icon icon={ScrollText} size="lg" />}
      title={auditoria.length === 0 ? "Nenhuma alteração registrada" : "Nenhum registro encontrado"}
      description={
        auditoria.length === 0
          ? "Cadastros e correções da administradora aparecem aqui, com o valor anterior."
          : "Ajuste a busca, a entidade ou a ação."
      }
    />
  );

  const desktopTable = (
    <Table aria-label="Auditoria">
      <TableHeader>
        <TableRow className="border-border-subtle/50 hover:bg-transparent">
          <TableHead sortable sortDirection={directionFor("data")} onSort={() => handleSort("data")}>
            Data
          </TableHead>
          <TableHead>Colaborador</TableHead>
          <TableHead sortable sortDirection={directionFor("entidade")} onSort={() => handleSort("entidade")}>
            Entidade
          </TableHead>
          <TableHead sortable sortDirection={directionFor("acao")} onSort={() => handleSort("acao")}>
            Ação
          </TableHead>
          <TableHead>Registro</TableHead>
          <TableHead>Campos</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visible.length === 0 ? (
          <TableEmpty colSpan={6}>{emptyState}</TableEmpty>
        ) : (
          pageRows.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{formatarData(item.dataHora)}</TableCell>
              <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
              <TableCell>{rotuloEntidade[item.entidade] ?? item.entidade}</TableCell>
              <TableCell>
                <Badge variant={badgeAcao[item.acao] ?? "secondary"}>{item.acao}</Badge>
              </TableCell>
              <TableCell>{item.registroId || "—"}</TableCell>
              <TableCell>{item.camposAlterados || "—"}</TableCell>
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
      <TableMobileList aria-label="Auditoria">
        {pageRows.map((item) => (
          <TableMobileCard key={item.id}>
            <TableMobileCardHeader>
              <span aria-hidden="true" />
              <TableMobileTitle>{rotuloEntidade[item.entidade] ?? item.entidade}</TableMobileTitle>
              <Badge variant={badgeAcao[item.acao] ?? "secondary"}>{item.acao}</Badge>
            </TableMobileCardHeader>
            <TableMobileFields>
              <TableMobileField label="Data">{formatarData(item.dataHora)}</TableMobileField>
              <TableMobileField label="Colaborador">{nomeUsuario(item.usuarioId)}</TableMobileField>
              <TableMobileField label="Registro">{item.registroId || "—"}</TableMobileField>
              <TableMobileField label="Campos">{item.camposAlterados || "—"}</TableMobileField>
            </TableMobileFields>
          </TableMobileCard>
        ))}
      </TableMobileList>
    );

  return (
    <WorkspaceShell>
      <PageHeader
        title="Auditoria"
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Auditoria" }]}
      />
      <PageContent>
        <FilterBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Buscar registro ou campo..."
          onApply={handleApply}
          onClear={handleClear}
          fields={[
            {
              id: "entidade",
              label: "Entidade",
              value: entidade,
              onChange: setEntidade,
              options: [
                { value: "todas", label: "Todas" },
                ...entidades.map((item) => ({ value: item, label: rotuloEntidade[item] ?? item })),
              ],
            },
            {
              id: "acao",
              label: "Ação",
              value: acao,
              onChange: setAcao,
              options: [
                { value: "todas", label: "Todas" },
                ...acoesAuditoria.map((item) => ({ value: item, label: item })),
              ],
            },
          ]}
        />
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ScrollText} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(visible.length).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">registros</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={ScrollText} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(alteracoes).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">alterações</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={ScrollText} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">{String(exclusoes).padStart(2, "0")}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">exclusões</p>
          </CardMetric>
        </div>
        <ResponsiveTable desktop={desktopTable} mobile={mobileTable} />
        {visible.length > 0 ? <Pagination page={currentPage} total={visible.length} onPageChange={setPage} /> : null}
      </PageContent>
    </WorkspaceShell>
  );
}
