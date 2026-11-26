"use client";

import { useCallback, useEffect, useState } from "react";
import { History } from "lucide-react";
import { Badge } from "@/components/badge";
import { Icon } from "@/components/icon";
import { SkeletonListPage } from "@/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { formatarData } from "@/data/catalogo";
import { HistoricoLinhaTempo } from "@/components/unidades/historico-linha-tempo";
import type { EventoHistoricoUnidade, HistoricoUnidadeReferencia } from "@/lib/historico-unidade/service";

type PeriodoInadimplencia = {
  id: number;
  inicioEm: string;
  fimEm: string | null;
};

type Props = {
  unidadeId: number;
  tituloUnidade?: string;
  tituloCondominio?: string;
};

export function InadimplenciaHistoricoPainel({ unidadeId, tituloUnidade, tituloCondominio }: Props) {
  const [periodos, setPeriodos] = useState<PeriodoInadimplencia[]>([]);
  const [referencia, setReferencia] = useState<HistoricoUnidadeReferencia | null>(null);
  const [eventos, setEventos] = useState<EventoHistoricoUnidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const [resPeriodos, resHistorico] = await Promise.all([
        fetch(`/api/unidades/${unidadeId}/periodos-inadimplencia`, { credentials: "same-origin" }),
        fetch(`/api/unidades/${unidadeId}/historico`, { credentials: "same-origin" }),
      ]);
      const bodyPeriodos = (await resPeriodos.json()) as {
        error?: string;
        periodos?: PeriodoInadimplencia[];
      };
      const bodyHistorico = (await resHistorico.json()) as {
        error?: string;
        referencia?: HistoricoUnidadeReferencia;
        eventos?: EventoHistoricoUnidade[];
      };
      if (!resPeriodos.ok) {
        setErro(bodyPeriodos.error ?? "Não foi possível carregar os períodos.");
        setPeriodos([]);
      } else {
        setPeriodos(bodyPeriodos.periodos ?? []);
      }
      if (resHistorico.ok) {
        setReferencia(bodyHistorico.referencia ?? null);
        setEventos(bodyHistorico.eventos ?? []);
      } else {
        setReferencia(null);
        setEventos([]);
        if (resPeriodos.ok) {
          setErro(bodyHistorico.error ?? "Não foi possível carregar as movimentações.");
        }
      }
    } catch {
      setErro("Não foi possível carregar o histórico da unidade.");
    } finally {
      setLoading(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  if (loading) {
    return <SkeletonListPage metrics={0} rows={4} cols={3} label="Carregando histórico da unidade" />;
  }

  const titulo = tituloUnidade ?? referencia?.unidade.identificacao ?? `Unidade ${unidadeId}`;
  const condominio = tituloCondominio ?? referencia?.condominio.nome ?? "";

  return (
    <div className="flex flex-col gap-md">
      <div
        className="rounded-lg border border-border-subtle bg-surface-card p-md shadow-card"
        aria-labelledby="historico-unidade-titulo"
      >
        <div className="flex items-start gap-sm">
          <Icon icon={History} size="md" className="text-on-surface-variant" />
          <div className="min-w-0">
            <h3 id="historico-unidade-titulo" className="text-label-lg font-semibold text-on-surface">
              Histórico consolidado — {titulo}
            </h3>
            {condominio ? (
              <p className="mt-xs text-body-sm text-on-surface-variant">{condominio}</p>
            ) : null}
          </div>
        </div>
      </div>

      {erro ? <p className="text-body-sm text-error">{erro}</p> : null}

      <section aria-label="Períodos de inadimplência" className="flex flex-col gap-sm">
        <h4 className="text-label-md font-semibold text-on-surface">Períodos de inadimplência</h4>
        {periodos.length === 0 ? (
          <p className="rounded-lg border border-border-subtle bg-surface-subtle px-md py-sm text-body-sm text-on-surface-variant">
            Nenhum período registrado para esta unidade.
          </p>
        ) : (
          <Table aria-label="Períodos de inadimplência da unidade" showExport={false}>
            <TableHeader>
              <TableRow className="border-border-subtle/50 hover:bg-transparent">
                <TableHead>Início</TableHead>
                <TableHead>Fim</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {periodos.map((periodo) => (
                <TableRow key={periodo.id}>
                  <TableCell>{formatarData(periodo.inicioEm)}</TableCell>
                  <TableCell>{periodo.fimEm ? formatarData(periodo.fimEm) : "—"}</TableCell>
                  <TableCell>
                    <Badge variant={periodo.fimEm ? "secondary" : "primary"}>
                      {periodo.fimEm ? "Encerrado" : "Em andamento"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section aria-label="Movimentações da unidade" className="flex flex-col gap-sm">
        <h4 className="text-label-md font-semibold text-on-surface">Movimentações</h4>
        <HistoricoLinhaTempo
          referencia={
            referencia ?? {
              unidade: {
                id: unidadeId,
                condominioId: 0,
                identificacao: titulo,
                bloco: "",
                tipo: "",
                status: "",
                situacao: "",
              },
              condominio: { id: 0, nome: condominio },
              cobranca: {
                situacao: "",
                reResponsavel: null,
                totalTentativas: 0,
                ultimoContato: null,
                debitosAbertos: 0,
                valorAberto: 0,
              },
              debitos: [],
            }
          }
          eventos={eventos}
        />
      </section>
    </div>
  );
}