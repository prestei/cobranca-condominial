"use client";

import { useEffect, useMemo, useState } from "react";
import { Building, Plus, ShieldCheck, User } from "lucide-react";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import {
  CondominioFormSheet,
  type CondominioFormValues,
} from "@/components/condominio-form-sheet";
import { CondominiosTable, type CondominioRow } from "@/components/condominios-table";
import { Icon } from "@/components/icon";
import { useCarteiraNav } from "@/components/layout/app-layout";
import { PageContent, PageHeader } from "@/components/page-header";
import { useToast } from "@/components/toast";

const initialRows: CondominioRow[] = [
  { id: "1", name: "Residencial Aurora", units: 84, situation: "Ativo" },
  { id: "2", name: "Ed. Central Park", units: 120, situation: "Ativo" },
  { id: "3", name: "Condomínio Horizonte", units: 64, situation: "Pendente" },
];

function valuesToRow(values: CondominioFormValues, id: string): CondominioRow {
  return {
    id,
    name: values.nome,
    units: values.units,
    situation: values.situation,
    estado: values.estado,
    cidade: values.cidade,
    cep: values.cep,
    logradouro: values.logradouro,
    numero: values.numero,
    complemento: values.complemento,
    observacao: values.observacao,
  };
}

export default function CondominiosPage() {
  const { toast } = useToast();
  const { setCounts } = useCarteiraNav();
  const [rows, setRows] = useState(initialRows);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit">("create");
  const [editingRow, setEditingRow] = useState<CondominioRow | null>(null);

  const metrics = useMemo(() => {
    const units = rows.reduce((sum, row) => sum + row.units, 0);
    const active = rows.filter((row) => row.situation === "Ativo").length;
    return {
      condominios: rows.length,
      units,
      active,
    };
  }, [rows]);

  useEffect(() => {
    setCounts({
      condominioCount: metrics.condominios,
      unidadeCount: metrics.units,
    });
  }, [metrics.condominios, metrics.units, setCounts]);

  function openCreateSheet() {
    setSheetMode("create");
    setEditingRow(null);
    setSheetOpen(true);
  }

  function openEditSheet(row: CondominioRow) {
    setSheetMode("edit");
    setEditingRow(row);
    setSheetOpen(true);
  }

  function handleSave(values: CondominioFormValues, mode: "create" | "edit", id?: string) {
    if (mode === "create") {
      const newId = String(Date.now());
      setRows((current) => [...current, valuesToRow(values, newId)]);
      return;
    }

    if (!id) return;
    setRows((current) => current.map((row) => (row.id === id ? valuesToRow(values, id) : row)));
  }

  function handleExport() {
    toast({
      variant: "info",
      title: "Exportação em preparação",
      description: "A exportação da carteira será disponibilizada em breve.",
    });
  }

  return (
    <>
      <PageHeader
        title="Condomínios"
        description="Acompanhe unidades, situação e ações da carteira."
        breadcrumbs={[
          { label: "Início", href: "/" },
          { label: "Carteira", href: "/condominios" },
          { label: "Condomínios" },
        ]}
        actions={
          <>
            <Button variant="outline" size="md" onClick={handleExport}>
              Exportar
            </Button>
            <Button size="md" onClick={openCreateSheet}>
              <Plus className="size-4" strokeWidth={2} aria-hidden="true" />
              Novo condomínio
            </Button>
          </>
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Building} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">
              {String(metrics.condominios).padStart(2, "0")}
            </p>
            <p className="mt-sm text-body-sm text-on-surface-variant">na carteira</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={User} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">{metrics.units}</p>
            <p className="mt-sm text-body-sm text-on-surface-variant">unidades</p>
          </CardMetric>
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={ShieldCheck} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">
              {String(metrics.active).padStart(2, "0")}
            </p>
            <p className="mt-sm text-body-sm text-on-surface-variant">ativos</p>
          </CardMetric>
        </div>
        <CondominiosTable rows={rows} onEditRow={openEditSheet} />
      </PageContent>

      <CondominioFormSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        mode={sheetMode}
        condominio={editingRow}
        onSave={handleSave}
      />
    </>
  );
}
