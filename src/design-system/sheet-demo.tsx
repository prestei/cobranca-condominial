"use client";

import { type FormEvent, useState } from "react";
import { Button } from "@/components/button";
import { FormField, Input } from "@/components/input";
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

export function SheetDemo() {
  const [sheetOpen, setSheetOpen] = useState(false);
  const { toast } = useToast();

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSheetOpen(false);
    toast({
      variant: "success",
      title: "Integração salva",
      description: "As configurações do pixel foram atualizadas.",
    });
  }

  return (
    <>
      <Button type="button" onClick={() => setSheetOpen(true)}>
        Abrir sheet de cadastro
      </Button>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent aria-labelledby="sheet-demo-title" aria-describedby="sheet-demo-desc">
          <SheetForm onSubmit={handleSave}>
            <SheetHeader>
              <SheetHeaderLead>
                <SheetHeaderIcon className="bg-primary-container text-on-primary">
                  <span className="text-headline-sm font-bold leading-none" aria-hidden="true">
                    f
                  </span>
                </SheetHeaderIcon>
                <SheetHeaderText>
                  <SheetTitle id="sheet-demo-title">Adicionar Pixel Facebook</SheetTitle>
                  <SheetDescription id="sheet-demo-desc">
                    Cadastre uma nova instância para a unidade selecionada.
                  </SheetDescription>
                </SheetHeaderText>
              </SheetHeaderLead>
              <SheetClose />
            </SheetHeader>

            <SheetBody>
              <FormField label="ID do Pixel" htmlFor="sheet-demo-pixel-id" required>
                <Input
                  id="sheet-demo-pixel-id"
                  name="pixelId"
                  placeholder="123456789012345"
                  inputMode="numeric"
                  required
                />
              </FormField>

              <FormField label="Token do Pixel (API)" htmlFor="sheet-demo-token">
                <Input
                  id="sheet-demo-token"
                  name="token"
                  placeholder="Token de acesso da Conversions API"
                  autoComplete="off"
                />
              </FormField>
            </SheetBody>

            <SheetFooterForm onClose={() => setSheetOpen(false)} />
          </SheetForm>
        </SheetContent>
      </Sheet>
    </>
  );
}
