"use client";

import { useMemo, useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import {
  Table,
  TableActionsCell,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
  TableSelectCell,
  type TableSortDirection,
} from "@/components/table";

type Situation = "Ativo" | "Pendente";

type CondominiumRow = {
  name: string;
  units: number;
  situation: Situation;
};

const initialRows: CondominiumRow[] = [
  { name: "Residencial Aurora", units: 84, situation: "Ativo" },
  { name: "Ed. Central Park", units: 120, situation: "Ativo" },
  { name: "Condomínio Horizonte", units: 64, situation: "Pendente" },
];

const situationBadge = {
  Ativo: "success" as const,
  Pendente: "secondary" as const,
};

type SortKey = "name" | "units" | "situation";

function nextDirection(current: TableSortDirection): TableSortDirection {
  if (current === "none") return "asc";
  if (current === "asc") return "desc";
  return "none";
}

export function CondominiumsTableDemo() {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<TableSortDirection>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    if (!sortKey || sortDirection === "none") {
      return initialRows;
    }

    const sorted = [...initialRows].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (sortKey === "units") {
        return a.units - b.units;
      }
      return a.situation.localeCompare(b.situation, "pt-BR");
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [sortKey, sortDirection]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      const next = nextDirection(sortDirection);
      setSortDirection(next);
      if (next === "none") {
        setSortKey(null);
      }
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  }

  function directionFor(key: SortKey): TableSortDirection {
    return sortKey === key ? sortDirection : "none";
  }

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.name));
  const someSelected = rows.some((row) => selected.has(row.name)) && !allSelected;

  function toggleRow(name: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(name);
      } else {
        next.delete(name);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(rows.map((row) => row.name)));
      return;
    }
    setSelected(new Set());
  }

  return (
    <Table aria-label="Condomínios na carteira">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            selection
            selectionChecked={allSelected}
            selectionIndeterminate={someSelected}
            onSelectionChange={toggleAll}
          />
          <TableHead sortable sortDirection={directionFor("name")} onSort={() => handleSort("name")}>
            Condomínio
          </TableHead>
          <TableHead
            align="right"
            className="w-28"
            sortable
            sortDirection={directionFor("units")}
            onSort={() => handleSort("units")}
          >
            Unidades
          </TableHead>
          <TableHead
            className="w-36"
            sortable
            sortDirection={directionFor("situation")}
            onSort={() => handleSort("situation")}
          >
            Situação
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableSelectCell
              checked={selected.has(row.name)}
              label={`Selecionar ${row.name}`}
              onCheckedChange={(checked) => toggleRow(row.name, checked)}
            />
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell align="right" className="tabular-nums">{row.units}</TableCell>
            <TableCell>
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableCell>
            <TableActionsCell />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export function CondominiumsTableEmptyDemo() {
  return (
    <Table aria-label="Exemplo sem registros">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead selection selectionChecked={false} selectionDisabled />
          <TableHead sortable sortDirection="none">Condomínio</TableHead>
          <TableHead align="right" className="w-28" sortable sortDirection="none">Unidades</TableHead>
          <TableHead className="w-36" sortable sortDirection="none">Situação</TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty colSpan={5}>
          <EmptyState
            icon={<Inbox className="size-6" strokeWidth={1.75} />}
            title="Nenhum condomínio encontrado"
            description="Ajuste os filtros ou cadastre um novo condomínio na carteira."
            action={
              <Button size="sm">
                <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
                Novo condomínio
              </Button>
            }
          />
        </TableEmpty>
      </TableBody>
    </Table>
  );
}
