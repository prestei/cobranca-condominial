"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Scale } from "lucide-react";
import { Badge } from "@/components/badge";
import { FormSteps } from "@/components/form-steps";
import { Icon } from "@/components/icon";
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
import type { EncaminhamentoJuridicoAcaoFormHandle } from "@/components/juridico/encaminhamento-juridico-acao-form";
import { EncaminhamentoJuridicoPainelDetalhe } from "@/components/juridico/encaminhamento-juridico-painel-detalhe";
import { acaoRapidaKanban, indicePassoKanban, PASSOS_FLUXO_KANBAN_JURIDICO } from "@/lib/juridico/kanban-colunas";
import { valorDebitosEncaminhamento } from "@/lib/juridico/valor-encaminhamento";
import { formatarMoeda, nomeCondominio, type Cadastros } from "@/data/catalogo";
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

function identificacaoUnidade(unidadeId: number, cadastros: Cadastros) {
  return cadastros.unidades.find((u) => u.id === unidadeId)?.identificacao?.trim() || "—";
}

type Props = {
  item: EncaminhamentoJuridicoDetalhe | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cadastros: Cadastros;
  podeEditar: boolean;
  abaInicial?: "resumo" | "acao";
  /** Pré-seleciona o próximo status na aba Ação (vindo do botão do card). */
  statusSugerido?: string;
  onSalvo?: () => void;
};

/** Resumo do caso (Kanban): resumo, ação, histórico e documentos no mesmo sheet. */
export function EncaminhamentoJuridicoDetalheSheet({
  item,
  open,
  onOpenChange,
  cadastros,
  podeEditar,
  abaInicial,
  statusSugerido,
  onSalvo,
}: Props) {
  const tituloId = useId();
  const acaoFormRef = useRef<EncaminhamentoJuridicoAcaoFormHandle>(null);
  const [aba, setAba] = useState<"resumo" | "acao" | "historico" | "documentos">("resumo");
  const [salvandoAcao, setSalvandoAcao] = useState(false);

  const titulo = item ? nomeCondominio(item.condominioId, cadastros) : "Caso jurídico";
  const descricao = item
    ? `Unidade ${identificacaoUnidade(item.unidadeId, cadastros)} · ${formatarMoeda(String(valorDebitosEncaminhamento(item, cadastros)))}`
    : "Encaminhamento jurídico";

  const abrirNaAcao: "resumo" | "acao" =
    abaInicial ??
    (Boolean(item) && podeEditar && acaoRapidaKanban(item!.status) ? "acao" : "resumo");

  useEffect(() => {
    setAba(abrirNaAcao);
  }, [item?.id, abrirNaAcao]);

  const podeRegistrarAcao =
    Boolean(item) &&
    podeEditar &&
    item!.status !== "Aguardando aprovação" &&
    item!.status !== "Rejeitado";

  const exibirRodapeAcao = podeRegistrarAcao && aba === "acao";

  function handleSalvo() {
    onSalvo?.();
    onOpenChange(false);
  }

  function handleAtualizado() {
    onSalvo?.();
  }

  return (
    <Sheet open={open && item !== null} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={tituloId} className="flex min-h-0 flex-col">
        <SheetHeader>
          <SheetHeaderLead>
            <SheetHeaderIcon>
              <Icon icon={Scale} size="md" />
            </SheetHeaderIcon>
            <SheetHeaderText>
              <SheetTitle id={tituloId}>{titulo}</SheetTitle>
              <SheetDescription>{descricao}</SheetDescription>
            </SheetHeaderText>
          </SheetHeaderLead>
          <SheetClose />
        </SheetHeader>

        {item ? (
          <SheetForm
            className="min-h-0 flex-1"
            onSubmit={(event) => {
              event.preventDefault();
              if (exibirRodapeAcao) {
                void acaoFormRef.current?.submit();
              }
            }}
          >
            <SheetBody className="gap-md">
              <div className="flex flex-wrap items-center justify-between gap-sm">
                <p className="text-label-md text-on-surface">Andamento do caso</p>
                <Badge variant={badgeStatus[item.status] ?? "secondary"}>{item.status}</Badge>
              </div>
              <SheetPanel className="px-sm py-md">
                <FormSteps steps={PASSOS_FLUXO_KANBAN_JURIDICO} current={indicePassoKanban(item.status)} />
              </SheetPanel>
              <EncaminhamentoJuridicoPainelDetalhe
                item={item}
                cadastros={cadastros}
                podeEditar={podeEditar}
                modoSheet
                somenteAbas
                abaInicial={abrirNaAcao}
                abaAtiva={aba}
                onAbaChange={(next) => setAba(next as typeof aba)}
                statusSugerido={statusSugerido}
                acaoFormRef={acaoFormRef}
                onSalvandoAcaoChange={setSalvandoAcao}
                onSalvo={handleSalvo}
                onAtualizado={handleAtualizado}
              />
            </SheetBody>
            {exibirRodapeAcao ? (
              <SheetFooterForm
                onClose={() => onOpenChange(false)}
                saveLabel={salvandoAcao ? "Salvando…" : "Salvar ação"}
                saveDisabled={salvandoAcao}
              />
            ) : null}
          </SheetForm>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}