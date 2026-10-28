"use client";

import { useCallback, useEffect, useId, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { FormField, Input, Select, Textarea } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooterForm,
  SheetForm,
  SheetHeader,
  SheetHeaderIcon,
  SheetHeaderLead,
  SheetHeaderText,
  SheetPanel,
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import {
  debitoEmAberto,
  formatarData,
  getCadastros,
  nomeUsuario,
  statusEncaminhamentoJuridico,
  type DocumentoJuridico,
  type EncaminhamentoJuridico,
} from "@/data/catalogo";
import type { EncaminhamentoJuridicoDetalhe } from "@/lib/juridico/service";
import { usePermissao } from "@/hooks/use-permissao";

type Props = {
  unidadeId: number | null;
  condominioId: number | null;
  tituloUnidade?: string;
  tituloCondominio?: string;
  encaminhamentoId?: string | null;
  onClose: () => void;
  onSalvo?: () => void;
};

const badgeStatus: Record<string, "success" | "secondary" | "error" | "neutral"> = {
  Encaminhado: "secondary",
  "Em análise": "secondary",
  "Documentação pendente": "neutral",
  "Aguardando decisão": "secondary",
  "Pronto para ajuizamento": "success",
  "Retornado à cobrança amigável": "neutral",
  Arquivado: "neutral",
};

export function EncaminhamentoJuridicoSheet({
  unidadeId,
  condominioId,
  tituloUnidade,
  tituloCondominio,
  encaminhamentoId,
  onClose,
  onSalvo,
}: Props) {
  const formId = useId();
  const { toast } = useToast();
  const { pode } = usePermissao();
  const podeCriar = pode("juridico", "criar");
  const podeEditar = pode("juridico", "editar");
  const podeLerDocs = pode("juridico", "ler");

  const [lista, setLista] = useState<EncaminhamentoJuridicoDetalhe[]>([]);
  const [detalhe, setDetalhe] = useState<EncaminhamentoJuridicoDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [observacoes, setObservacoes] = useState("");
  const [resumoContexto, setResumoContexto] = useState("");
  const [advogadoResponsavel, setAdvogadoResponsavel] = useState("");
  const [debitoIds, setDebitoIds] = useState<number[]>([]);

  const [statusPorId, setStatusPorId] = useState<Record<string, string>>({});
  const [observacoesPorId, setObservacoesPorId] = useState<Record<string, string>>({});
  const [docTitulo, setDocTitulo] = useState("");
  const [docDescricao, setDocDescricao] = useState("");
  const [docReferencia, setDocReferencia] = useState("");
  const [docSalvando, setDocSalvando] = useState(false);

  const condominio = useMemo(() => {
    if (condominioId === null) return undefined;
    return getCadastros().condominios.find((item) => item.id === condominioId);
  }, [condominioId, lista.length]);

  const advogadosOpcoes = condominio?.advogados ?? [];

  const debitosUnidade = useMemo(() => {
    if (unidadeId === null) return [];
    return getCadastros()
      .debitos.filter((item) => item.unidadeId === unidadeId)
      .sort((a, b) => b.dataVencimento.localeCompare(a.dataVencimento));
  }, [unidadeId, lista.length]);

  const debitosSelecionaveis = debitosUnidade.filter(debitoEmAberto);

  const carregar = useCallback(async () => {
    if (encaminhamentoId) {
      setLoading(true);
      try {
        const response = await fetch(`/api/juridico/encaminhamentos/${encaminhamentoId}`, {
          credentials: "same-origin",
        });
        const payload = (await response.json()) as { error?: string; encaminhamento?: EncaminhamentoJuridicoDetalhe };
        if (!response.ok) {
          setDetalhe(null);
          toast({ variant: "error", title: "Erro ao carregar", description: payload.error });
          return;
        }
        setDetalhe(payload.encaminhamento ?? null);
      } finally {
        setLoading(false);
      }
      return;
    }

    if (unidadeId === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/juridico/encaminhamentos?unidadeId=${unidadeId}`, {
        credentials: "same-origin",
      });
      const payload = (await response.json()) as { error?: string; encaminhamentos?: EncaminhamentoJuridicoDetalhe[] };
      if (!response.ok) {
        setLista([]);
        toast({ variant: "error", title: "Erro ao carregar", description: payload.error });
        return;
      }
      setLista(payload.encaminhamentos ?? []);
    } finally {
      setLoading(false);
    }
  }, [encaminhamentoId, toast, unidadeId]);

  useEffect(() => {
    if (encaminhamentoId) {
      void carregar();
      return;
    }
    if (unidadeId === null) {
      setLista([]);
      setDetalhe(null);
      return;
    }
    if (condominio?.advogados[0]) {
      setAdvogadoResponsavel(condominio.advogados[0]);
    }
    void carregar();
  }, [carregar, condominio?.advogados, encaminhamentoId, unidadeId]);

  useEffect(() => {
    if (unidadeId === null || encaminhamentoId) return;
    setDebitoIds(debitosSelecionaveis.map((item) => item.id));
  }, [debitosSelecionaveis, encaminhamentoId, unidadeId]);

  const aberto = encaminhamentoId ? true : unidadeId !== null;
  const titulo = tituloUnidade ?? "Unidade";
  const condominioNome = tituloCondominio ?? condominio?.nome ?? "";

  async function enviarNovo(event: FormEvent) {
    event.preventDefault();
    if (condominioId === null || unidadeId === null || !podeCriar) return;
    setSalvando(true);
    try {
      const response = await fetch("/api/juridico/encaminhamentos", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          condominioId,
          unidadeId,
          advogadoResponsavel,
          observacoes,
          resumoContexto,
          debitoIds,
        }),
      });
      const payload = (await response.json()) as { error?: string; encaminhamento?: EncaminhamentoJuridico };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível encaminhar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Encaminhamento registrado" });
      setObservacoes("");
      setResumoContexto("");
      onSalvo?.();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function salvarEncaminhamento(id: string) {
    if (!podeEditar) return;
    setSalvando(true);
    try {
      const response = await fetch(`/api/juridico/encaminhamentos/${id}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusPorId[id],
          observacoes: observacoesPorId[id],
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Erro ao atualizar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Acompanhamento atualizado" });
      onSalvo?.();
      void carregar();
    } finally {
      setSalvando(false);
    }
  }

  async function registrarDocumento(encaminhamentoRef: string) {
    if (!podeEditar || !podeLerDocs) return;
    setDocSalvando(true);
    try {
      const response = await fetch(`/api/juridico/encaminhamentos/${encaminhamentoRef}/documentos`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo: docTitulo,
          descricao: docDescricao,
          referenciaArquivo: docReferencia,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Erro ao registrar documento", description: payload.error });
        return;
      }
      setDocTitulo("");
      setDocDescricao("");
      setDocReferencia("");
      toast({ variant: "success", title: "Documento registrado" });
      onSalvo?.();
      void carregar();
    } finally {
      setDocSalvando(false);
    }
  }

  function renderDocumentos(documentos: DocumentoJuridico[] | undefined) {
    if (!podeLerDocs) {
      return (
        <p className="text-body-sm text-on-surface-variant">
          Documentos disponíveis apenas para perfis com permissão jurídica.
        </p>
      );
    }
    if (!documentos?.length) {
      return <p className="text-body-sm text-on-surface-variant">Nenhum documento registrado.</p>;
    }
    return (
      <ul className="flex flex-col gap-sm text-body-sm">
        {documentos.map((doc) => (
          <li key={doc.id} className="rounded-md border border-border-subtle px-md py-sm">
            <p className="font-medium text-on-surface">{doc.titulo}</p>
            {doc.descricao ? <p className="text-on-surface-variant">{doc.descricao}</p> : null}
            {doc.referenciaArquivo ? (
              <p className="text-label-sm text-on-surface-variant">Ref.: {doc.referenciaArquivo}</p>
            ) : null}
            <p className="text-label-sm text-on-surface-variant">
              {formatarData(doc.registradoEm)} · {nomeUsuario(doc.registradoPorId)}
            </p>
          </li>
        ))}
      </ul>
    );
  }

  function renderItem(item: EncaminhamentoJuridicoDetalhe) {
    const statusAtual = statusPorId[item.id] ?? item.status;
    const obsAtual = observacoesPorId[item.id] ?? item.observacoes;
    return (
      <div key={item.id} className="flex flex-col gap-md rounded-lg border border-border-subtle p-md">
        <div className="flex flex-wrap items-center gap-sm">
          <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
          <span className="text-body-sm text-on-surface-variant">
            {formatarData(item.encaminhadoEm)} · Adv. {item.advogadoResponsavel}
          </span>
        </div>
        {item.resumoContexto ? <p className="text-body-sm text-on-surface">{item.resumoContexto}</p> : null}
        {item.observacoes ? <p className="text-body-sm text-on-surface-variant">{item.observacoes}</p> : null}

        {podeEditar ? (
          <div className="flex flex-col gap-sm border-t border-border-subtle pt-md">
            <FormField label="Status">
              <Select
                value={statusAtual}
                onChange={(event) => setStatusPorId((atual) => ({ ...atual, [item.id]: event.target.value }))}
              >
                {statusEncaminhamentoJuridico.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField label="Observações">
              <Textarea
                value={obsAtual}
                onChange={(event) => setObservacoesPorId((atual) => ({ ...atual, [item.id]: event.target.value }))}
                rows={3}
              />
            </FormField>
            <Button type="button" size="sm" disabled={salvando} onClick={() => void salvarEncaminhamento(item.id)}>
              Salvar acompanhamento
            </Button>
          </div>
        ) : null}

        <div className="border-t border-border-subtle pt-md">
          <p className="text-label-md text-on-surface">Documentos</p>
          <div className="mt-sm">{renderDocumentos(item.documentos)}</div>
          {podeEditar && podeLerDocs ? (
            <div className="mt-md flex flex-col gap-sm">
              <FormField label="Título do documento">
                <Input value={docTitulo} onChange={(event) => setDocTitulo(event.target.value)} />
              </FormField>
              <FormField label="Descrição">
                <Textarea value={docDescricao} onChange={(event) => setDocDescricao(event.target.value)} rows={2} />
              </FormField>
              <FormField label="Referência (pasta, arquivo interno)">
                <Input value={docReferencia} onChange={(event) => setDocReferencia(event.target.value)} />
              </FormField>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={docSalvando}
                onClick={() => void registrarDocumento(item.id)}
              >
                Registrar documento
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  const itens = detalhe ? [detalhe] : lista;

  return (
    <Sheet
      open={aberto}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <SheetContent aria-labelledby={`${formId}-juridico-title`}>
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Scale} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={`${formId}-juridico-title`}>Jurídico — {titulo}</SheetTitle>
              <SheetDescription>
                {condominioNome ? `${condominioNome} — encaminhamento e acompanhamento` : "Encaminhamento jurídico"}
              </SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>
        <SheetBody>
          {podeCriar && !encaminhamentoId ? (
            <SheetForm id={`${formId}-novo`} onSubmit={enviarNovo}>
              <SheetPanel className="mb-md">
                <p className="text-label-md text-on-surface">Novo encaminhamento</p>
                <p className="mt-xs text-body-sm text-on-surface-variant">
                  Registra análise jurídica sem ajuizar ações nem enviar documentos a tribunais automaticamente.
                </p>
                <div className="mt-md flex flex-col gap-md">
                  <FormField label="Advogado responsável">
                    <Select value={advogadoResponsavel} onChange={(event) => setAdvogadoResponsavel(event.target.value)}>
                      {advogadosOpcoes.map((nome) => (
                        <option key={nome} value={nome}>
                          {nome}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                  {debitosSelecionaveis.length > 0 ? (
                    <FormField label="Débitos incluídos">
                      <div className="flex max-h-32 flex-col gap-xs overflow-y-auto rounded-md border border-border-subtle p-sm">
                        {debitosSelecionaveis.map((debito) => (
                          <label key={debito.id} className="flex items-center gap-sm text-body-sm">
                            <input
                              type="checkbox"
                              checked={debitoIds.includes(debito.id)}
                              onChange={(event) => {
                                setDebitoIds((atual) =>
                                  event.target.checked
                                    ? [...atual, debito.id]
                                    : atual.filter((id) => id !== debito.id),
                                );
                              }}
                            />
                            {debito.referencia} — {debito.status}
                          </label>
                        ))}
                      </div>
                    </FormField>
                  ) : null}
                  <FormField label="Contexto adicional">
                    <Textarea value={resumoContexto} onChange={(event) => setResumoContexto(event.target.value)} rows={2} />
                  </FormField>
                  <FormField label="Observações">
                    <Textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={3} />
                  </FormField>
                </div>
              </SheetPanel>
              <SheetFooterForm
                onClose={onClose}
                saveLabel={salvando ? "Encaminhando…" : "Encaminhar para análise"}
                saveDisabled={salvando || condominioId === null}
              />
            </SheetForm>
          ) : null}

          <SheetPanel className="max-h-[min(28rem,60vh)] overflow-y-auto">
            {loading ? (
              <p className="text-body-sm text-on-surface-variant">Carregando…</p>
            ) : itens.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">Nenhum encaminhamento registrado para esta unidade.</p>
            ) : (
              <div className="flex flex-col gap-md">{itens.map(renderItem)}</div>
            )}
          </SheetPanel>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
