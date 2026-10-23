"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/badge";
import { Checkbox } from "@/components/input";
import {
  ResponsiveTable,
  Table,
  TableActionsButton,
  TableActionsCell,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableMobileCard,
  TableMobileCardHeader,
  TableMobileField,
  TableMobileFields,
  TableMobileList,
  TableMobileTitle,
  TableMobileToolbar,
  TableRow,
  TableSelectCell,
  type TableSortDirection,
} from "@/components/table";

export type CondominioSituation = "Ativo" | "Pendente";

export type CondominioRow = {
  id: string;
  name: string;
  units: number;
  situation: CondominioSituation;
  estado?: string;
  cidade?: string;
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  observacao?: string;
};

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

type CondominiosTableProps = {
  rows: CondominioRow[];
  onEditRow?: (row: CondominioRow) => void;
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

export function CondominiosTable({ rows: sourceRows, onEditRow, viewport = "auto" }: CondominiosTableProps) {
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDirection, setSortDirection] = useState<TableSortDirection>("none");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    if (!sortKey || sortDirection === "none") {
      return sourceRows;
    }

    const sorted = [...sourceRows].sort((a, b) => {
      if (sortKey === "name") {
        return a.name.localeCompare(b.name, "pt-BR");
      }
      if (sortKey === "units") {
        return a.units - b.units;
      }
      return a.situation.localeCompare(b.situation, "pt-BR");
    });

    return sortDirection === "desc" ? sorted.reverse() : sorted;
  }, [sortKey, sortDirection, sourceRows]);

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

  const allSelected = rows.length > 0 && rows.every((row) => selected.has(row.id));
  const someSelected = rows.some((row) => selected.has(row.id)) && !allSelected;

  function toggleRow(id: string, checked: boolean) {
    setSelected((current) => {
      const next = new Set(current);
      if (checked) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    if (checked) {
      setSelected(new Set(rows.map((row) => row.id)));
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
          <TableRow key={row.id}>
            <TableSelectCell
              checked={selected.has(row.id)}
              label={`Selecionar ${row.name}`}
              onCheckedChange={(checked) => toggleRow(row.id, checked)}
            />
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell align="right" className="tabular-nums">
              {row.units}
            </TableCell>
            <TableCell>
              <Badge variant={situationBadge[row.situation]}>{row.situation}</Badge>
            </TableCell>
            <TableActionsCell
              label={`Ações para ${row.name}`}
              onClick={() => onEditRow?.(row)}
            />
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const mobileTable = (
    <TableMobileList aria-label="Condomínios na carteira">
      <TableMobileToolbar>
        <SelectAllCheckbox checked={allSelected} indeterminate={someSelected} onChange={toggleAll} />
        <span className="text-label-md text-primary-container">Selecionar todos</span>
      </TableMobileToolbar>
      {rows.map((row) => (
        <TableMobileCard key={row.id}>
          <TableMobileCardHeader>
            <Checkbox
              checked={selected.has(row.id)}
              aria-label={`Selecionar ${row.name}`}
              onChange={(event) => toggleRow(row.id, event.target.checked)}
            />
            <TableMobileTitle>{row.name}</TableMobileTitle>
            <TableActionsButton label={`Ações para ${row.name}`} onClick={() => onEditRow?.(row)} />
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

  return <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />;
}
