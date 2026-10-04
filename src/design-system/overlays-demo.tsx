"use client";

import { useState } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { useToast } from "@/components/toast";

export function OverlaysDemo() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const { toast } = useToast();

  function handleConfirm() {
    setDialogOpen(false);
    toast({
      variant: "success",
      title: "Condomínio removido",
      description: "O registro foi excluído da carteira.",
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-md">
        <Button type="button" onClick={() => setDialogOpen(true)}>
          Abrir dialog
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() =>
            toast({
              variant: "info",
              title: "Sincronização agendada",
              description: "Os dados serão atualizados às 22h.",
            })
          }
        >
          Toast informativo
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() =>
            toast({
              variant: "error",
              title: "Falha ao salvar",
              description: "Verifique a conexão e tente novamente.",
            })
          }
        >
          Toast de erro
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent aria-labelledby="overlay-demo-title" aria-describedby="overlay-demo-desc">
          <DialogHeader>
            <DialogTitle id="overlay-demo-title">Remover condomínio?</DialogTitle>
            <DialogDescription id="overlay-demo-desc">
              Esta ação remove o condomínio da carteira. Você pode cadastrá-lo novamente depois.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleConfirm}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
