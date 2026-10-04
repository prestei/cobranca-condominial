"use client";

import { type FormEvent, useEffect, useId, useState } from "react";
import { Building } from "lucide-react";
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
  SheetTitle,
} from "@/components/sheet";
import { useToast } from "@/components/toast";
import type { CondominioRow, CondominioSituation } from "@/components/condominios-table";

export type CondominioFormValues = {
  nome: string;
  estado: string;
  cidade: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  observacao: string;
  situation: CondominioSituation;
  units: number;
};

const emptyValues: CondominioFormValues = {
  nome: "",
  estado: "",
  cidade: "",
  cep: "",
  logradouro: "",
  numero: "",
  complemento: "",
  observacao: "",
  situation: "Pendente",
  units: 0,
};

function rowToValues(row: CondominioRow): CondominioFormValues {
  return {
    nome: row.name,
    estado: row.estado ?? "",
    cidade: row.cidade ?? "",
    cep: row.cep ?? "",
    logradouro: row.logradouro ?? "",
    numero: row.numero ?? "",
    complemento: row.complemento ?? "",
    observacao: row.observacao ?? "",
    situation: row.situation,
    units: row.units,
  };
}

type CondominioFormSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  condominio?: CondominioRow | null;
  onSave: (values: CondominioFormValues, mode: "create" | "edit", id?: string) => void;
};

export function CondominioFormSheet({
  open,
  onOpenChange,
  mode,
  condominio,
  onSave,
}: CondominioFormSheetProps) {
  const formId = useId();
  const titleId = `${formId}-title`;
  const descId = `${formId}-desc`;
  const { toast } = useToast();
  const [values, setValues] = useState<CondominioFormValues>(emptyValues);

  useEffect(() => {
    if (!open) return;
    if (mode === "edit" && condominio) {
      setValues(rowToValues(condominio));
      return;
    }
    setValues(emptyValues);
  }, [open, mode, condominio]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSave(values, mode, condominio?.id);
    onOpenChange(false);
    toast({
      variant: "success",
      title: mode === "create" ? "Condomínio cadastrado" : "Condomínio atualizado",
      description:
        mode === "create"
          ? `${values.nome} foi adicionado à carteira.`
          : `As informações de ${values.nome} foram salvas.`,
    });
  }

  const isCreate = mode === "create";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent aria-labelledby={titleId} aria-describedby={descId}>
        <SheetForm onSubmit={handleSubmit}>
          <SheetHeader>
            <SheetHeaderLead>
              <SheetHeaderIcon className="bg-primary-container text-on-primary">
                <Building className="size-5" strokeWidth={2} aria-hidden="true" />
              </SheetHeaderIcon>
              <SheetHeaderText>
                <SheetTitle id={titleId}>{isCreate ? "Novo condomínio" : "Editar condomínio"}</SheetTitle>
                <SheetDescription id={descId}>
                  {isCreate
                    ? "Cadastre um condomínio na carteira do escritório."
                    : "Atualize os dados do condomínio selecionado."}
                </SheetDescription>
              </SheetHeaderText>
            </SheetHeaderLead>
            <SheetClose />
          </SheetHeader>

          <SheetBody>
            <FormField label="Nome do condomínio" htmlFor={`${formId}-nome`} required>
              <Input
                id={`${formId}-nome`}
                name="nome"
                value={values.nome}
                onChange={(event) => setValues((current) => ({ ...current, nome: event.target.value }))}
                placeholder="Ex.: Residencial Aurora"
                required
              />
            </FormField>

            <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
              <FormField label="Estado" htmlFor={`${formId}-estado`}>
                <Input
                  id={`${formId}-estado`}
                  name="estado"
                  value={values.estado}
                  onChange={(event) => setValues((current) => ({ ...current, estado: event.target.value }))}
                  placeholder="UF"
                  maxLength={2}
                />
              </FormField>
              <FormField label="Cidade" htmlFor={`${formId}-cidade`}>
                <Input
                  id={`${formId}-cidade`}
                  name="cidade"
                  value={values.cidade}
                  onChange={(event) => setValues((current) => ({ ...current, cidade: event.target.value }))}
                />
              </FormField>
            </div>

            <FormField label="CEP" htmlFor={`${formId}-cep`}>
              <Input
                id={`${formId}-cep`}
                name="cep"
                value={values.cep}
                onChange={(event) => setValues((current) => ({ ...current, cep: event.target.value }))}
                placeholder="00000-000"
                inputMode="numeric"
              />
            </FormField>

            <FormField label="Logradouro" htmlFor={`${formId}-logradouro`}>
              <Input
                id={`${formId}-logradouro`}
                name="logradouro"
                value={values.logradouro}
                onChange={(event) => setValues((current) => ({ ...current, logradouro: event.target.value }))}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
              <FormField label="Número" htmlFor={`${formId}-numero`}>
                <Input
                  id={`${formId}-numero`}
                  name="numero"
                  value={values.numero}
                  onChange={(event) => setValues((current) => ({ ...current, numero: event.target.value }))}
                />
              </FormField>
              <FormField label="Complemento" htmlFor={`${formId}-complemento`}>
                <Input
                  id={`${formId}-complemento`}
                  name="complemento"
                  value={values.complemento}
                  onChange={(event) => setValues((current) => ({ ...current, complemento: event.target.value }))}
                />
              </FormField>
            </div>

            <div className="grid grid-cols-1 gap-md min-[480px]:grid-cols-2">
              <FormField label="Unidades na carteira" htmlFor={`${formId}-units`}>
                <Input
                  id={`${formId}-units`}
                  name="units"
                  type="number"
                  min={0}
                  value={values.units || ""}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      units: Number.parseInt(event.target.value, 10) || 0,
                    }))
                  }
                  inputMode="numeric"
                />
              </FormField>
              <FormField label="Situação na carteira" htmlFor={`${formId}-situation`}>
                <Select
                  id={`${formId}-situation`}
                  name="situation"
                  value={values.situation}
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      situation: event.target.value as CondominioSituation,
                    }))
                  }
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                </Select>
              </FormField>
            </div>

            <FormField label="Observação" htmlFor={`${formId}-observacao`}>
              <Textarea
                id={`${formId}-observacao`}
                name="observacao"
                value={values.observacao}
                onChange={(event) => setValues((current) => ({ ...current, observacao: event.target.value }))}
                rows={3}
              />
            </FormField>
          </SheetBody>

          <SheetFooterForm onClose={() => onOpenChange(false)} saveLabel={isCreate ? "Cadastrar" : "Salvar"} />
        </SheetForm>
      </SheetContent>
    </Sheet>
  );
}
