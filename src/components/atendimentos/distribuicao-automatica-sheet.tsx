"use client";

import { useId } from "react";
import { Network } from "lucide-react";
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
  SheetTitle,
} from "@/components/sheet";
import {
  DistribuicaoAutomaticaConfigForm,
  useDistribuicaoAutomaticaConfig,
} from "@/components/atendimentos/distribuicao-automatica-config";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  refreshKey?: string;
  onSalvo?: () => void;
};

export function DistribuicaoAutomaticaSheet({ open, onOpenChange, refreshKey, onSalvo }: Props) {
  const baseId = useId();
  const config = useDistribuicaoAutomaticaConfig({
    refreshKey,
    onSalvo,
    enabled: open,
  });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={`${baseId}-title`} aria-describedby={`${baseId}-desc`}>
        <SheetForm
          onSubmit={(event) => {
            event.preventDefault();
            void config.salvar();
          }}
        >
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon>
                <Icon icon={Network} size="md" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id={`${baseId}-title`}>Distribuição automática</SheetTitle>
                <SheetDescription id={`${baseId}-desc`}>
                  Escolha a regra e salve. Com a opção ativa, cobranças sem RE são atribuídas automaticamente.
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>
          <SheetBody>
            <DistribuicaoAutomaticaConfigForm {...config} idsPrefix={baseId.replace(/:/g, "")} />
          </SheetBody>
          <SheetFooterForm
            onClose={() => onOpenChange(false)}
            saveLabel={config.salvando ? "Salvando…" : "Salvar"}
            saveDisabled={config.salvando || !config.temAlteracao}
          />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}
