"use client";

import { useId } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmVariant?: "primary" | "critical";
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  confirmVariant = "primary",
  onConfirm,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descriptionId = useId();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
      >
        <DialogHeader>
          <DialogTitle id={titleId}>{title}</DialogTitle>
          {description ? (
            <DialogDescription id={descriptionId}>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <DialogFooter>
          {confirmVariant === "critical" ? (
            <Button type="button" variant="critical" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
          <Button
            type="button"
            variant={confirmVariant === "critical" ? "primary" : "outline"}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          {confirmVariant === "primary" ? (
            <Button type="button" onClick={onConfirm}>
              {confirmLabel}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
