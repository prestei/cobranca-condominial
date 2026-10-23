"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { ClipboardList, DoorOpen, Link2, Pencil, Plus, Receipt, Trash2 } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Icon } from "@/components/icon";
import { FormField, Input, Select } from "@/components/input";
import {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
  formatarData,
  formatarMoeda,
  nomeCondominio,
  unidadeComDebitoOperacional,
  setResponsaveis,
  tiposPessoa,
  tiposVinculo,
  type Responsavel,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
import { usePermissao } from "@/hooks/use-permissao";
import { aplicarVinculoRemovido, aplicarVinculoSalvo } from "@/lib/unidades/sync-cliente";
import { podeVerDadosPessoaisResponsavel } from "@/lib/privacidade/dados-pessoais";
import type { ResponsavelResposta } from "@/lib/privacidade/dados-pessoais";

type VinculoDetalhe = Vinculo & { responsavel: ResponsavelResposta | null };

type DetalheUnidade = {
  unidade: {
    id: number;
    condominioId: number;
    identificacao: string;
    bloco: string;
    tipo: string;
    status: string;
    situacao: string;
  };
  vinculos: VinculoDetalhe[];
  resumo: {
    debitosAbertos: number;
    valorAberto: number;
    totalDebitos: number;
    totalAtendimentos: number;
    ultimosDebitos: Array<{
      id: number;
      referencia: string;
      status: string;
      dataVencimento: string;
      valorAtualizado: string;
    }>;
    ultimosAtendimentos: Array<{
      id: string;
      dataHora: string;
      canal: string;
      assunto: string;
      status: string;
    }>;
  };
};

function DetalheCampo({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs">
      <p className="text-label-md text-on-surface-variant">{label}</p>
      <p className="text-body-md text-on-surface">{value.trim() ? value : "—"}</p>
    </div>
  );
}

type Props = {
  unidadeId: number | null;
  onClose: () => void;
  responsaveisDisponiveis: Responsavel[];
  onMutacao: () => void;
  onEditar?: (unidade: DetalheUnidade["unidade"]) => void;
};

export function UnidadeDetalheSheet({ unidadeId, onClose, responsaveisDisponiveis, onMutacao, onEditar }: Props) {
  const formId = useId();
  const router = useRouter();
  const { toast } = useToast();
  const { permissoes, pode } = usePermissao();
  const [detalhe, setDetalhe] = useState<DetalheUnidade | null>(null);
  const [loading, setLoading] = useState(false);
  const [vinculoOpen, setVinculoOpen] = useState(false);
  const [removerVinculo, setRemoverVinculo] = useState<VinculoDetalhe | null>(null);
  const [modoNovoResponsavel, setModoNovoResponsavel] = useState(false);
  const [vinculoForm, setVinculoForm] = useState({
    responsavelId: "",
    tipoVinculo: "Proprietario",
    principal: true,
    observacoes: "",
    nome: "",
    cpfCnpj: "",
    tipoPessoa: "Fisica",
  });

  const verPessoais = podeVerDadosPessoaisResponsavel(permissoes);

  const carregar = useCallback(async () => {
    if (unidadeId === null) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/unidades/${unidadeId}`, { credentials: "same-origin" });
      const payload = (await response.json()) as DetalheUnidade & { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível carregar", description: payload.error });
        onClose();
        return;
      }
      setDetalhe(payload);
    } finally {
      setLoading(false);
    }
  }, [onClose, toast, unidadeId]);

  useEffect(() => {
    if (unidadeId === null) {
      setDetalhe(null);
      return;
    }
    void carregar();
  }, [carregar, unidadeId]);

  async function confirmarRemoverVinculo() {
    if (!removerVinculo || unidadeId === null) return;
    const response = await fetch(`/api/unidades/${unidadeId}/vinculos/${removerVinculo.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      toast({ variant: "error", title: "Erro ao remover vínculo", description: payload.error });
      setRemoverVinculo(null);
      return;
    }
    aplicarVinculoRemovido(removerVinculo.id);
    setRemoverVinculo(null);
    toast({ variant: "success", title: "Vínculo removido" });
    onMutacao();
    void carregar();
  }

  async function salvarVinculo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unidadeId === null) return;

    const body = modoNovoResponsavel
      ? {
          tipoVinculo: vinculoForm.tipoVinculo,
          principal: vinculoForm.principal,
          observacoes: vinculoForm.observacoes,
          responsavel: {
            nome: vinculoForm.nome,
            cpfCnpj: vinculoForm.cpfCnpj,
            tipoPessoa: vinculoForm.tipoPessoa,
            telefone: "",
            whatsapp: "",
            email: "",
            endereco: "",
            observacoes: "",
          },
        }
      : {
          responsavelId: Number(vinculoForm.responsavelId),
          tipoVinculo: vinculoForm.tipoVinculo,
          principal: vinculoForm.principal,
          observacoes: vinculoForm.observacoes,
        };

    const response = await fetch(`/api/unidades/${unidadeId}/vinculos`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { vinculo?: Vinculo; error?: string };
    if (!response.ok) {
      toast({ variant: "error", title: "Erro ao vincular", description: payload.error });
      return;
    }
    if (payload.vinculo) {
      aplicarVinculoSalvo(unidadeId, payload.vinculo);
    }
    if (modoNovoResponsavel) {
      void fetch(`/api/unidades/${unidadeId}`, { credentials: "same-origin" })
        .then((r) => r.json())
        .then((d: DetalheUnidade) => {
          if (d.vinculos) {
            for (const v of d.vinculos) {
              if (v.responsavel && verPessoais) {
                setResponsaveis((current) => {
                  if (current.some((item) => item.id === v.responsavel!.id)) return current;
                  return [...current, v.responsavel as Responsavel];
                });
              }
            }
          }
        });
    }
    setVinculoOpen(false);
    setVinculoForm({
      responsavelId: "",
      tipoVinculo: "Proprietario",
      principal: true,
      observacoes: "",
      nome: "",
      cpfCnpj: "",
      tipoPessoa: "Fisica",
    });
    toast({ variant: "success", title: "Responsável vinculado" });
    onMutacao();
    void carregar();
  }

  const aberto = unidadeId !== null;

  return (
    <>
      <Sheet
        open={aberto}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent aria-labelledby={`${formId}-detalhe-title`}>
          {loading || !detalhe ? (
            <SheetBody>
              <p className="text-body-md text-on-surface-variant">{loading ? "Carregando…" : "—"}</p>
            </SheetBody>
          ) : (
            <>
              <SheetHeader>
                <SheetHeaderLead>
                  <SheetHeaderIcon>
                    <Icon icon={DoorOpen} size="md" />
                  </SheetHeaderIcon>
                  <SheetHeaderText>
                    <SheetTitle id={`${formId}-detalhe-title`}>{detalhe.unidade.identificacao}</SheetTitle>
                    <SheetDescription>
                      {nomeCondominio(detalhe.unidade.condominioId)} — histórico de cobrança e responsáveis.
                    </SheetDescription>
                  </SheetHeaderText>
                </SheetHeaderLead>
                <SheetClose />
              </SheetHeader>
              <SheetBody className="flex flex-col gap-md">
                <SheetPanel variant="tint">
                  <div className="grid grid-cols-2 gap-md">
                    <DetalheCampo label="Bloco" value={detalhe.unidade.bloco} />
                    <DetalheCampo label="Tipo" value={detalhe.unidade.tipo} />
                    <DetalheCampo label="Situação cadastral" value={detalhe.unidade.status} />
                    <DetalheCampo label="Cobrança" value={detalhe.unidade.situacao} />
                  </div>
                </SheetPanel>

                <SheetPanel className="flex flex-col gap-md">
                  <div className="flex items-center justify-between gap-md">
                    <p className="text-label-lg text-on-surface">Condôminos e responsáveis</p>
                    {pode("unidades", "editar") ? (
                      <Button type="button" size="sm" variant="outline" onClick={() => setVinculoOpen(true)}>
                        <Icon icon={Plus} size="sm" />
                        Vincular
                      </Button>
                    ) : null}
                  </div>
                  {detalhe.vinculos.length === 0 ? (
                    <p className="text-body-sm text-on-surface-variant">Nenhum responsável vinculado.</p>
                  ) : (
                    detalhe.vinculos.map((vinculo) => (
                      <div key={vinculo.id} className="flex items-start justify-between gap-md border-b border-border-subtle pb-md last:border-0 last:pb-0">
                        <div className="min-w-0">
                          <p className="text-label-lg text-on-surface">{vinculo.responsavel?.nome ?? "—"}</p>
                          <p className="text-body-sm text-on-surface-variant">
                            {vinculo.tipoVinculo}
                            {vinculo.principal ? " · Responsável financeiro principal" : ""}
                          </p>
                          {vinculo.responsavel ? (
                            <p className="mt-xs text-body-sm text-on-surface-variant">
                              {vinculo.responsavel.cpfCnpj}
                              {verPessoais && vinculo.responsavel.telefone ? ` · ${vinculo.responsavel.telefone}` : ""}
                            </p>
                          ) : null}
                        </div>
                        {pode("unidades", "editar") ? (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setRemoverVinculo(vinculo)}>
                            <Icon icon={Trash2} size="sm" />
                          </Button>
                        ) : null}
                      </div>
                    ))
                  )}
                </SheetPanel>

                <SheetPanel className="flex flex-col gap-md">
                  <p className="text-label-lg text-on-surface">Resumo de cobrança</p>
                  <div className="flex flex-wrap gap-sm">
                    {(() => {
                      const emDebito = unidadeComDebitoOperacional(
                        detalhe.unidade,
                        detalhe.resumo.debitosAbertos > 0,
                      );
                      return (
                        <>
                    <Badge variant={emDebito ? "error" : "success"}>
                      {emDebito
                        ? `${detalhe.resumo.debitosAbertos} débito(s) em aberto`
                        : "Em dia"}
                    </Badge>
                    {emDebito ? (
                      <span className="text-body-sm tabular-nums text-on-surface">{formatarMoeda(String(detalhe.resumo.valorAberto))}</span>
                    ) : null}
                        </>
                      );
                    })()}
                    <Badge variant="secondary">{detalhe.resumo.totalAtendimentos} atendimento(s)</Badge>
                  </div>
                  {detalhe.resumo.ultimosDebitos.length > 0 ? (
                    <div>
                      <p className="mb-sm text-label-md text-on-surface-variant">Últimos débitos</p>
                      <ul className="flex flex-col gap-xs text-body-sm text-on-surface">
                        {detalhe.resumo.ultimosDebitos.map((item) => (
                          <li key={item.id}>
                            {item.referencia} · {item.status} · {formatarMoeda(item.valorAtualizado)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  {detalhe.resumo.ultimosAtendimentos.length > 0 ? (
                    <div>
                      <p className="mb-sm text-label-md text-on-surface-variant">Últimos atendimentos</p>
                      <ul className="flex flex-col gap-xs text-body-sm text-on-surface">
                        {detalhe.resumo.ultimosAtendimentos.map((item) => (
                          <li key={item.id}>
                            {formatarData(item.dataHora)} · {item.canal} · {item.assunto || "—"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </SheetPanel>
              </SheetBody>
              <SheetFooter>
                <Button type="button" variant="outline" onClick={onClose}>
                  Fechar
                </Button>
                {onEditar ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEditar(detalhe.unidade as Unidade)}
                  >
                    <Icon icon={Pencil} size="sm" />
                    Editar
                  </Button>
                ) : null}
                {pode("debitos", "ler") ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/debitos?unidade=${detalhe.unidade.id}`)}
                  >
                    <Icon icon={Receipt} size="sm" />
                    Débitos
                  </Button>
                ) : null}
                {pode("atendimentos", "ler") ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.push(`/atendimentos?unidade=${detalhe.unidade.id}`)}
                  >
                    <Icon icon={ClipboardList} size="sm" />
                    Atendimentos
                  </Button>
                ) : null}
                {pode("atendimentos", "criar") ? (
                  <Button type="button" onClick={() => router.push(`/atendimentos?novo=1&unidade=${detalhe.unidade.id}`)}>
                    <Icon icon={Link2} size="sm" />
                    Registrar atendimento
                  </Button>
                ) : null}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Sheet open={vinculoOpen} onOpenChange={setVinculoOpen}>
        <SheetContent aria-labelledby={`${formId}-vinculo-title`}>
          <SheetForm onSubmit={salvarVinculo}>
            <SheetHeader>
              <SheetHeaderText>
                <SheetTitle id={`${formId}-vinculo-title`}>Vincular responsável</SheetTitle>
                <SheetDescription>Proprietário, inquilino ou responsável financeiro da unidade.</SheetDescription>
              </SheetHeaderText>
              <SheetClose />
            </SheetHeader>
            <SheetBody className="flex flex-col gap-md">
              <FormField label="Origem" htmlFor={`${formId}-modo`}>
                <Select
                  id={`${formId}-modo`}
                  value={modoNovoResponsavel ? "novo" : "existente"}
                  onChange={(event) => setModoNovoResponsavel(event.target.value === "novo")}
                >
                  <option value="existente">Responsável já cadastrado</option>
                  <option value="novo">Cadastrar novo</option>
                </Select>
              </FormField>
              {modoNovoResponsavel ? (
                <>
                  <FormField label="Nome" htmlFor={`${formId}-nome`} required>
                    <Input
                      id={`${formId}-nome`}
                      value={vinculoForm.nome}
                      onChange={(event) => setVinculoForm((c) => ({ ...c, nome: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="CPF/CNPJ" htmlFor={`${formId}-cpf`} required>
                    <Input
                      id={`${formId}-cpf`}
                      value={vinculoForm.cpfCnpj}
                      onChange={(event) => setVinculoForm((c) => ({ ...c, cpfCnpj: event.target.value }))}
                    />
                  </FormField>
                  <FormField label="Tipo de pessoa" htmlFor={`${formId}-tipo-pessoa`}>
                    <Select
                      id={`${formId}-tipo-pessoa`}
                      value={vinculoForm.tipoPessoa}
                      onChange={(event) => setVinculoForm((c) => ({ ...c, tipoPessoa: event.target.value }))}
                    >
                      {tiposPessoa.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </Select>
                  </FormField>
                </>
              ) : (
                <FormField label="Responsável" htmlFor={`${formId}-resp`} required>
                  <Select
                    id={`${formId}-resp`}
                    value={vinculoForm.responsavelId}
                    onChange={(event) => setVinculoForm((c) => ({ ...c, responsavelId: event.target.value }))}
                  >
                    <option value="">Selecione</option>
                    {responsaveisDisponiveis.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.nome}
                      </option>
                    ))}
                  </Select>
                </FormField>
              )}
              <FormField label="Vínculo" htmlFor={`${formId}-tipo-vinculo`} required>
                <Select
                  id={`${formId}-tipo-vinculo`}
                  value={vinculoForm.tipoVinculo}
                  onChange={(event) => setVinculoForm((c) => ({ ...c, tipoVinculo: event.target.value }))}
                >
                  {tiposVinculo.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Responsável financeiro principal" htmlFor={`${formId}-principal`}>
                <Select
                  id={`${formId}-principal`}
                  value={vinculoForm.principal ? "sim" : "nao"}
                  onChange={(event) => setVinculoForm((c) => ({ ...c, principal: event.target.value === "sim" }))}
                >
                  <option value="sim">Sim</option>
                  <option value="nao">Não</option>
                </Select>
              </FormField>
              <FormField label="Observações" htmlFor={`${formId}-obs-vinculo`}>
                <Input
                  id={`${formId}-obs-vinculo`}
                  value={vinculoForm.observacoes}
                  onChange={(event) => setVinculoForm((c) => ({ ...c, observacoes: event.target.value }))}
                />
              </FormField>
            </SheetBody>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setVinculoOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar vínculo</Button>
            </SheetFooter>
          </SheetForm>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={removerVinculo !== null}
        onOpenChange={(open) => {
          if (!open) setRemoverVinculo(null);
        }}
        title="Remover vínculo?"
        description={removerVinculo?.responsavel?.nome}
        confirmLabel="Remover"
        cancelLabel="Cancelar"
        confirmVariant="critical"
        onConfirm={confirmarRemoverVinculo}
      />
    </>
  );
}
