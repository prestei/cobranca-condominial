"use client";

import { useState } from "react";
import { TableExport, type TableExportFormat } from "@/components/table";
import { useToast } from "@/components/toast";
import { useAuth } from "@/context/auth-context";
import { usePermissao } from "@/hooks/use-permissao";

type Props = {
  filtrosQuery: string;
  className?: string;
};

function baixarBlob(blob: Blob, nome: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nome;
  link.click();
  URL.revokeObjectURL(url);
}

export function DashboardExportacaoCarteira({ filtrosQuery, className }: Props) {
  const { pode } = usePermissao();
  const { toast } = useToast();
  const { user } = useAuth();
  const [listagem, setListagem] = useState<"fila" | "atendimentos">("fila");
  const [exportando, setExportando] = useState(false);

  if (!user || !pode("dashboard", "ler") || !pode("atendimentos", "ler")) {
    return null;
  }

  async function aoExportar(formato: TableExportFormat) {
    if (formato === "pdf") {
      toast({
        variant: "info",
        title: "Exportação no dashboard",
        description: "Use CSV ou Excel para exportar a carteira com os filtros aplicados.",
      });
      return;
    }
    setExportando(true);
    try {
      const base = filtrosQuery ? `${filtrosQuery}&` : "";
      const qs = `${base}listagem=${listagem}&formato=${formato === "csv" ? "csv" : "xls"}`;
      const response = await fetch(`/api/dashboard/export?${qs}`, { credentials: "same-origin" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        toast({
          variant: "error",
          title: "Exportação não concluída",
          description: body.error ?? "Verifique permissões e filtros.",
        });
        return;
      }
      const blob = await response.blob();
      const ext = formato === "csv" ? "csv" : "xls";
      const prefix = listagem === "fila" ? "carteira-fila-dashboard" : "carteira-atendimentos-dashboard";
      baixarBlob(blob, `${prefix}.${ext}`);
      toast({
        variant: "success",
        title: formato === "csv" ? "CSV baixado" : "Planilha baixada",
        description: "Arquivo gerado com data/hora e filtros aplicados.",
      });
    } catch {
      toast({ variant: "error", title: "Falha na exportação", description: "Tente novamente." });
    } finally {
      setExportando(false);
    }
  }

  return (
    <section
      className={`flex flex-col gap-sm rounded-xl border border-border-subtle bg-surface-card p-md shadow-card ${className ?? ""}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <div>
          <h2 className="text-headline-sm text-on-surface">Exportar carteira</h2>
          <p className="text-body-sm text-on-surface-variant">Respeita filtros do dashboard e suas permissões.</p>
        </div>
        <div className="flex flex-wrap items-center gap-sm">
          <label htmlFor="dashboard-export-listagem" className="text-body-sm text-on-surface-variant">
            Listagem:
          </label>
          <select
            id="dashboard-export-listagem"
            value={listagem}
            disabled={exportando}
            onChange={(event) => setListagem(event.target.value as "fila" | "atendimentos")}
            className="rounded-lg border border-border-subtle bg-surface-card px-sm py-xs text-body-md text-on-surface"
          >
            <option value="fila">Fila de cobranças</option>
            <option value="atendimentos">Atendimentos no período</option>
          </select>
          <TableExport onExport={(formato) => void aoExportar(formato)} />
        </div>
      </div>
    </section>
  );
}
