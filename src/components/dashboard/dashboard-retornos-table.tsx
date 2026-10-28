"use client";

import { Badge } from "@/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { formatarData } from "@/data/catalogo";
import type { DashboardRetornoLinha } from "@/lib/dashboard/service";
import { badgeVariantRetorno, rotuloSituacaoRetorno } from "@/components/dashboard/dashboard-shared";

type Props = {
  itens: DashboardRetornoLinha[];
  mostrarRe?: boolean;
  vazio?: string;
};

export function DashboardRetornosTable({
  itens,
  mostrarRe = true,
  vazio = "Nenhum retorno atrasado, de hoje ou dos próximos 7 dias.",
}: Props) {
  return (
    <div className="overflow-hidden rounded-lg border border-border-subtle">
      <Table aria-label="Retornos agendados">
        <TableHeader>
          <TableRow className="border-border-subtle/50 hover:bg-transparent">
            <TableHead>Quando</TableHead>
            <TableHead>Unidade</TableHead>
            {mostrarRe ? <TableHead>RE</TableHead> : null}
            <TableHead>Próxima ação</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {itens.length === 0 ? (
            <TableEmpty colSpan={mostrarRe ? 5 : 4}>{vazio}</TableEmpty>
          ) : (
            itens.map((item) => (
              <TableRow key={item.atendimentoId}>
                <TableCell>{formatarData(item.dataPrevista)}</TableCell>
                <TableCell className="font-medium">{item.unidadeLabel}</TableCell>
                {mostrarRe ? <TableCell>{item.codigoRe ?? "—"}</TableCell> : null}
                <TableCell>{item.proximaAcao}</TableCell>
                <TableCell>
                  <Badge variant={badgeVariantRetorno(item.situacaoAgenda)}>
                    {rotuloSituacaoRetorno(item.situacaoAgenda)}
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
