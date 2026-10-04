"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Inbox, Plus } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { EmptyState } from "@/components/empty-state";
import { Checkbox } from "@/components/input";
import {
  ResponsiveTable,
  Table,
  TableActionsButton,
  TableActionsCell,
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
  TableMobileToolbar,
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

type CondominiumsTableDemoProps = {
  viewport?: "auto" | "desktop" | "mobile";
};

function SelectAllCheckbox({
  checked,
  indeterminate,
  onChange,
}: {
  checked: boolean;
  indeterminate: boolean;
  onChange: (checked: boolean) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.indeterminate = indeterminate;
    }
  }, [indeterminate, checked]);

  return (
    <Checkbox
      ref={ref}
      checked={checked}
      aria-label="Selecionar todos"
      onChange={(event) => onChange(event.target.checked)}
    />
  );
}

export function CondominiumsTableDemo({ viewport = "auto" }: CondominiumsTableDemoProps) {
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

  const desktopTable = (
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
            <TableCell align="right" className="tabular-nums">
              {row.units}
            </TableCell>
            <TableCell>
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableCell>
            <TableActionsCell label={`Ações para ${row.name}`} />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const mobileTable = (
    <TableMobileList aria-label="Condomínios na carteira">
      <TableMobileToolbar>
        <SelectAllCheckbox
          checked={allSelected}
          indeterminate={someSelected}
          onChange={toggleAll}
        />
        <span className="text-label-md text-primary-container">Selecionar todos</span>
      </TableMobileToolbar>
      {rows.map((row) => (
        <TableMobileCard key={row.name}>
          <TableMobileCardHeader>
            <Checkbox
              checked={selected.has(row.name)}
              aria-label={`Selecionar ${row.name}`}
              onChange={(event) => toggleRow(row.name, event.target.checked)}
            />
            <TableMobileTitle>{row.name}</TableMobileTitle>
            <TableActionsButton label={`Ações para ${row.name}`} />
          </TableMobileCardHeader>
          <TableMobileFields>
            <TableMobileField label="Unidades" valueClassName="tabular-nums">
              {row.units}
            </TableMobileField>
            <TableMobileField label="Situação">
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableMobileField>
          </TableMobileFields>
        </TableMobileCard>
      ))}
    </TableMobileList>
  );

  return (
    <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />
  );
}

type CondominiumsTableEmptyDemoProps = {
  viewport?: "auto" | "desktop" | "mobile";
};

export function CondominiumsTableEmptyDemo({ viewport = "auto" }: CondominiumsTableEmptyDemoProps) {
  const emptyState = (
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
  );

  const desktopTable = (
    <Table aria-label="Exemplo sem registros">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead selection selectionChecked={false} selectionDisabled />
          <TableHead sortable sortDirection="none">
            Condomínio
          </TableHead>
          <TableHead align="right" className="w-28" sortable sortDirection="none">
            Unidades
          </TableHead>
          <TableHead className="w-36" sortable sortDirection="none">
            Situação
          </TableHead>
          <TableHead actions />
        </TableRow>
      </TableHeader>
      <TableBody>
        <TableEmpty colSpan={5}>{emptyState}</TableEmpty>
      </TableBody>
    </Table>
  );

  const mobileTable = <TableMobileEmpty>{emptyState}</TableMobileEmpty>;

  return (
    <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />
  );
}
