"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { EmptyState } from "@/components/empty-state";
import { FilterBar } from "@/components/filter-bar";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import { EncaminhamentoJuridicoSheet } from "@/components/juridico/encaminhamento-juridico-sheet";
import {
  escopoCondominios,
  formatarData,
  nomeCondominio,
  nomeUnidade,
  opcoesAdvogadosResponsaveis,
  statusEncaminhamentoJuridico,
} from "@/data/catalogo";
import { useAuth } from "@/context/auth-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  Encaminhado: "secondary",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

export default function JuridicoPage() {
  const { user: sessao } = useAuth();
  const cadastros = useCadastros();
  const { pode } = usePermissao();

  const [encaminhamentos, setEncaminhamentos] = useState<EncaminhamentoJuridicoDetalhe[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState({ status: "todos", condominio: "todos", advogado: "todos", busca: "" });
  const [detalhe, setDetalhe] = useState<{
    unidadeId: number;
    condominioId: number;
    unidade: string;
    condominio: string;
  } | null>(null);

  const condominiosEscopo = useMemo(
    () => escopoCondominios(cadastros, sessao?.userId),
    [cadastros, sessao?.userId],
  );

  const advogadosFiltro = useMemo(() => opcoesAdvogadosResponsaveis(cadastros), [cadastros]);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filtro.status !== "todos") params.set("status", filtro.status);
      if (filtro.condominio !== "todos") params.set("condominioId", filtro.condominio);
      if (filtro.advogado !== "todos") params.set("advogado", filtro.advogado);
      const response = await fetch(`/api/juridico/encaminhamentos?${params.toString()}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { encaminhamentos?: EncaminhamentoJuridicoDetalhe[] };
      setEncaminhamentos(payload.encaminhamentos ?? []);
    } finally {
      setLoading(false);
    }
  }, [filtro.advogado, filtro.condominio, filtro.status]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  const linhas = useMemo(() => {
    const busca = filtro.busca.trim().toLowerCase();
    return encaminhamentos.filter((item) => {
      if (!busca) return true;
      const unidade = nomeUnidade(item.unidadeId).toLowerCase();
      const condominio = nomeCondominio(item.condominioId).toLowerCase();
      return (
        unidade.includes(busca) ||
        condominio.includes(busca) ||
        item.advogadoResponsavel.toLowerCase().includes(busca) ||
        item.status.toLowerCase().includes(busca)
      );
    });
  }, [encaminhamentos, filtro.busca]);

  return (
    <WorkspaceShell>
      <PageHeader
        title="Jurídico"
        description="Encaminhamentos para análise jurídica e acompanhamento pelos advogados responsáveis. O sistema não ajuíza ações nem envia documentos a tribunais."
        breadcrumbs={[{ label: "Início", href: "/" }, { label: "Jurídico" }]}
      />
      <PageContent>
        <FilterBar
          searchValue={filtro.busca}
          onSearchChange={(busca) => setFiltro((atual) => ({ ...atual, busca }))}
          searchPlaceholder="Buscar unidade, condomínio ou advogado…"
          fields={[
            {
              id: "status",
              label: "Status",
              value: filtro.status,
              onChange: (status) => setFiltro((atual) => ({ ...atual, status })),
              options: [
                { value: "todos", label: "Todos" },
                ...statusEncaminhamentoJuridico.map((item) => ({ value: item, label: item })),
              ],
            },
            {
              id: "condominio",
              label: "Condomínio",
              value: filtro.condominio,
              onChange: (condominio) => setFiltro((atual) => ({ ...atual, condominio })),
              options: [
                { value: "todos", label: "Todos" },
                ...condominiosEscopo.map((item) => ({ value: String(item.id), label: item.nome })),
              ],
            },
            {
              id: "advogado",
              label: "Advogado",
              value: filtro.advogado,
              onChange: (advogado) => setFiltro((atual) => ({ ...atual, advogado })),
              options: [
                { value: "todos", label: "Todos" },
                ...advogadosFiltro.map((item) => ({ value: item, label: item })),
              ],
            },
          ]}
          onApply={() => void carregar()}
          onClear={() => {
            setFiltro({ status: "todos", condominio: "todos", advogado: "todos", busca: "" });
          }}
        />

        {loading ? (
          <p className="text-body-sm text-on-surface-variant">Carregando encaminhamentos…</p>
        ) : linhas.length === 0 ? (
          <EmptyState
            icon={<Scale className="size-6" aria-hidden />}
            title="Nenhum encaminhamento"
            description={
              pode("juridico", "criar")
                ? "Encaminhe casos a partir da fila de cobranças ou do histórico da unidade."
                : "Não há casos no seu escopo com os filtros aplicados."
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Encaminhado</TableHead>
                <TableHead>Condomínio</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Advogado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Documentos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linhas.map((item) => (
                <TableRow
                  key={item.id}
                  className="cursor-pointer"
                  onClick={() =>
                    setDetalhe({
                      unidadeId: item.unidadeId,
                      condominioId: item.condominioId,
                      unidade: nomeUnidade(item.unidadeId),
                      condominio: nomeCondominio(item.condominioId),
                    })
                  }
                >
                  <TableCell>{formatarData(item.encaminhadoEm)}</TableCell>
                  <TableCell>{nomeCondominio(item.condominioId)}</TableCell>
                  <TableCell>{nomeUnidade(item.unidadeId)}</TableCell>
                  <TableCell>{item.advogadoResponsavel}</TableCell>
                  <TableCell>
                    <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
                  </TableCell>
                  <TableCell>{item.documentos?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageContent>

      <EncaminhamentoJuridicoSheet
        unidadeId={detalhe?.unidadeId ?? null}
        condominioId={detalhe?.condominioId ?? null}
        tituloUnidade={detalhe?.unidade}
        tituloCondominio={detalhe?.condominio}
        onClose={() => setDetalhe(null)}
        onSalvo={() => void carregar()}
      />
    </WorkspaceShell>
  );
}
