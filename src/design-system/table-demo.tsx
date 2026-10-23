"use client";

import { Inbox, Plus } from "lucide-react";
import { Button } from "@/components/button";
import { CondominiosTable, type CondominioRow } from "@/components/condominiums-table";
import { EmptyState } from "@/components/empty-state";
import {
  ResponsiveTable,
  Table,
  TableBody,
  TableEmpty,
  TableHead,
  TableHeader,
  TableMobileEmpty,
  TableRow,
} from "@/components/table";

const demoRows: CondominioRow[] = [
  { id: "demo-1", name: "Residencial Aurora", units: 84, situation: "Ativo" },
  { id: "demo-2", name: "Ed. Central Park", units: 120, situation: "Ativo" },
  { id: "demo-3", name: "Condomínio Horizonte", units: 64, situation: "Pendente" },
];

type CondominiumsTableDemoProps = {
  viewport?: "auto" | "desktop" | "mobile";
};

export function CondominiumsTableDemo({ viewport = "auto" }: CondominiumsTableDemoProps) {
  return <CondominiosTable rows={demoRows} viewport={viewport} />;
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

  return <ResponsiveTable viewport={viewport} desktop={desktopTable} mobile={mobileTable} />;
}
