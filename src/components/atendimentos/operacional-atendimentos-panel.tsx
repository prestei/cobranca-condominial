"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { SkeletonTable } from "@/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { formatarData, nomeCondominio, nomeUnidade, type Atendimento } from "@/data/catalogo";
import { useCadastros } from "@/hooks/use-cadastros";
import type { IndicadorOperacionalAtendenteId } from "@/lib/dashboard/indicadores-operacionais-atendente";

const ROTULOS: Record<IndicadorOperacionalAtendenteId, string> = {
  pendentes: "Atendimentos pendentes",
  aguardando_retorno: "Aguardando retorno",
  resolvidos_periodo: "Resolvidos no período",
  atencao: "Atenção necessária",
};

const ALIASES_URL: Record<string, IndicadorOperacionalAtendenteId> = {
  pendentes: "pendentes",
  "aguardando-retorno": "aguardando_retorno",
  aguardando_retorno: "aguardando_retorno",
  resolvidos: "resolvidos_periodo",
  resolvidos_periodo: "resolvidos_periodo",
  atencao: "atencao",
};

export function parseOperacionalQuery(valor: string | null): IndicadorOperacionalAtendenteId | null {
  if (!valor?.trim()) return null;
  return ALIASES_URL[valor.trim()] ?? null;
}

export function OperacionalAtendimentosPanel() {
  const cadastros = useCadastros();
  const router = useRouter();
  const searchParams = useSearchParams();
  const operacional = parseOperacionalQuery(searchParams?.get("operacional") ?? null);
  const de = searchParams?.get("de")?.trim() ?? "";
  const ate = searchParams?.get("ate")?.trim() ?? "";

  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [itens, setItens] = useState<Atendimento[]>([]);

  const titulo = operacional ? ROTULOS[operacional] : "";

  const recarregar = useCallback(async () => {
    if (!operacional) return;
    setCarregando(true);
    setErro("");
    try {
      const params = new URLSearchParams();
      params.set("operacional", operacional);
      if (de) params.set("de", de);
      if (ate) params.set("ate", ate);
      const response = await fetch(`/api/atendimentos?${params}`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; atendimentos?: Atendimento[] };
      if (!response.ok) throw new Error(payload.error ?? "Não foi possível carregar os registros.");
      setItens(payload.atendimentos ?? []);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar.");
      setItens([]);
    } finally {
      setCarregando(false);
    }
  }, [ate, de, operacional]);

  useEffect(() => {
    void recarregar();
  }, [recarregar]);

  const periodoTexto = useMemo(() => {
    if (!de || !ate) return null;
    return `${formatarData(de)} a ${formatarData(ate)}`;
  }, [ate, de]);

  function limparFiltro() {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.delete("operacional");
    params.delete("de");
    params.delete("ate");
    const qs = params.toString();
    router.replace(qs ? `/atendimentos?${qs}` : "/atendimentos");
  }

  if (!operacional) return null;

  return (
    <section
      aria-label={titulo}
      className="flex flex-col gap-md rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <h2 className="text-title-md font-semibold text-on-surface">{titulo}</h2>
          <p className="text-body-sm text-on-surface-variant">
            {operacional === "resolvidos_periodo" && periodoTexto
              ? `Período: ${periodoTexto}.`
              : "Registros na sua carteira vigente com o critério do indicador."}
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={limparFiltro}>
          <Icon icon={X} size="sm" />
          Limpar filtro
        </Button>
      </div>

      {carregando ? <SkeletonTable rows={6} cols={6} label="Carregando registros" /> : null}

      {!carregando && erro ? (
        <Alert variant="error" title="Erro ao carregar">
          {erro}
          <div className="mt-md">
            <Button size="sm" variant="secondary" onClick={() => void recarregar()}>
              Tentar novamente
            </Button>
          </div>
        </Alert>
      ) : null}

      {!carregando && !erro ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead>Condomínio</TableHead>
              <TableHead>Unidade</TableHead>
              <TableHead>Canal</TableHead>
              <TableHead>Respondeu</TableHead>
              <TableHead>Situação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {itens.length === 0 ? (
              <TableEmpty colSpan={6}>Nenhum registro para este indicador.</TableEmpty>
            ) : (
              itens.map((item) => {
                const unidadeId = Number(item.unidadeId);
                const unidade = nomeUnidade(unidadeId);
                const condominioId =
                  cadastros.unidades.find((u) => u.id === unidadeId)?.condominioId ?? 0;
                return (
                  <TableRow key={item.id} id={`atendimento-${item.id}`}>
                    <TableCell>{formatarData(item.dataHora.slice(0, 10))}</TableCell>
                    <TableCell>{nomeCondominio(condominioId)}</TableCell>
                    <TableCell>{unidade}</TableCell>
                    <TableCell>{item.canal}</TableCell>
                    <TableCell>{item.respondeu}</TableCell>
                    <TableCell>{item.status}</TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      ) : null}
    </section>
  );
}
