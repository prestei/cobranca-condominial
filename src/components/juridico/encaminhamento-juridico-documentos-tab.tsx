"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { useToast } from "@/components/toast";
import { formatarData, type DocumentoJuridico } from "@/data/catalogo";
import { LEGAL_DOCUMENT_MAX_BYTES } from "@/lib/juridico/document-file-limits";

type Props = {
  encaminhamentoId: string;
  documentos?: DocumentoJuridico[];
  podeEditar: boolean;
  onRegistrado?: () => void;
};

function documentoTemArquivo(doc: DocumentoJuridico): boolean {
  const ref = doc.referenciaArquivo?.trim() ?? "";
  return ref.includes("/") && !ref.toLowerCase().startsWith("drive/");
}

/** Tabela de anexos do encaminhamento com envio de arquivo. */
export function EncaminhamentoJuridicoDocumentosTab({
  encaminhamentoId,
  documentos,
  podeEditar,
  onRegistrado,
}: Props) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);

  const lista = documentos ?? [];

  async function enviarArquivo(file: File) {
    if (file.size > LEGAL_DOCUMENT_MAX_BYTES) {
      toast({
        variant: "error",
        title: "Arquivo grande demais",
        description: `Limite de ${Math.round(LEGAL_DOCUMENT_MAX_BYTES / (1024 * 1024))} MiB por arquivo.`,
      });
      return;
    }
    setEnviando(true);
    try {
      const formData = new FormData();
      formData.append("arquivo", file);
      const response = await fetch(`/api/juridico/encaminhamentos/${encaminhamentoId}/documentos`, {
        method: "POST",
        credentials: "same-origin",
        body: formData,
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        toast({ variant: "error", title: "Não foi possível enviar", description: payload.error });
        return;
      }
      toast({ variant: "success", title: "Arquivo enviado" });
      onRegistrado?.();
    } finally {
      setEnviando(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function aoSelecionar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void enviarArquivo(file);
  }

  return (
    <div className="flex flex-col gap-md">
      {podeEditar ? (
        <div className="flex flex-wrap items-center gap-sm">
          <input
            ref={inputRef}
            type="file"
            className="sr-only"
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp,.txt,.zip"
            disabled={enviando}
            onChange={aoSelecionar}
          />
          <Button
            type="button"
            variant="primary"
            className="gap-sm"
            disabled={enviando}
            onClick={() => inputRef.current?.click()}
          >
            <Icon icon={Upload} size="sm" aria-hidden />
            {enviando ? "Enviando…" : "Enviar arquivo"}
          </Button>
          <p className="text-body-sm text-on-surface-variant">
            PDF, Office, imagem ou ZIP — até {Math.round(LEGAL_DOCUMENT_MAX_BYTES / (1024 * 1024))} MiB.
          </p>
        </div>
      ) : null}

      <Table showExport={false} fitContainer aria-label="Documentos do caso">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Arquivo</TableHead>
            <TableHead>Enviado em</TableHead>
            <TableHead align="right">Ação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {lista.map((doc) => {
            const comArquivo = documentoTemArquivo(doc);
            return (
              <TableRow key={doc.id}>
                <TableCell className="max-w-[14rem] truncate font-medium" title={doc.titulo}>
                  {doc.titulo}
                </TableCell>
                <TableCell className="tabular-nums text-on-surface-variant">
                  {formatarData(doc.registradoEm)}
                </TableCell>
                <TableCell align="right">
                  {comArquivo ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-xs"
                      onClick={() => {
                        window.open(
                          `/api/juridico/encaminhamentos/${encaminhamentoId}/documentos/${doc.id}/arquivo`,
                          "_blank",
                          "noopener,noreferrer",
                        );
                      }}
                    >
                      <Icon icon={Download} size="sm" aria-hidden />
                      Baixar
                    </Button>
                  ) : (
                    <span className="text-body-sm text-on-surface-variant">—</span>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}