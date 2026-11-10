"use client";

import { useState, type DragEvent } from "react";
import { FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { SheetHelpText } from "@/components/sheet";

type Props = {
  nomeArquivo: string;
  descricao: string;
  error?: string;
  processando?: boolean;
  onEscolher: () => void;
  onArquivo: (arquivo: File) => void;
  onRemover: () => void;
};

export function ImportacaoArquivoCampo({
  nomeArquivo,
  descricao,
  error,
  processando = false,
  onEscolher,
  onArquivo,
  onRemover,
}: Props) {
  const [arrastando, setArrastando] = useState(false);

  function liberarArraste(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
  }

  function aoEntrarArraste(event: DragEvent<HTMLDivElement>) {
    liberarArraste(event);
    if (!processando) setArrastando(true);
  }

  function aoSairArraste(event: DragEvent<HTMLDivElement>) {
    liberarArraste(event);
    setArrastando(false);
  }

  function aoSoltar(event: DragEvent<HTMLDivElement>) {
    liberarArraste(event);
    setArrastando(false);
    if (processando) return;
    const arquivo = event.dataTransfer.files?.[0];
    if (arquivo) onArquivo(arquivo);
  }

  if (nomeArquivo) {
    return (
      <div className="flex flex-col gap-sm">
        <div className="flex items-center gap-md rounded-xl border border-border-subtle bg-surface-card p-md shadow-card">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-fixed/40 text-primary-container"
            aria-hidden="true"
          >
            <Icon icon={FileText} size="md" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-label-lg text-on-surface">{nomeArquivo}</p>
            <p className="text-body-sm text-on-surface-variant">Arquivo pronto para validar</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-label="Remover arquivo"
            disabled={processando}
            onClick={onRemover}
          >
            <Icon icon={X} size="sm" />
          </Button>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button type="button" variant="surface" size="sm" disabled={processando} onClick={onEscolher}>
            <Icon icon={Upload} size="sm" />
            Trocar arquivo
          </Button>
        </div>
        <SheetHelpText className="w-full min-w-0 [&>span]:truncate" title={descricao}>
          {descricao}
        </SheetHelpText>
      </div>
    );
  }

  const borda = error
    ? "border-status-critical bg-error-container/40"
    : arrastando
      ? "border-brass bg-gold-subtle"
      : "border-border-strong bg-surface-subtle hover:border-brass hover:bg-gold-subtle/60";

  return (
    <div className="flex flex-col gap-sm">
      <div
        className={`flex w-full cursor-pointer flex-col items-center gap-md rounded-xl border border-dashed px-md py-xl text-center transition-colors ${borda} ${
          processando ? "pointer-events-none opacity-60" : ""
        }`}
        onClick={() => {
          if (!processando) onEscolher();
        }}
        onDragEnter={aoEntrarArraste}
        onDragOver={aoEntrarArraste}
        onDragLeave={aoSairArraste}
        onDrop={aoSoltar}
      >
        <div
          className="flex size-12 items-center justify-center rounded-lg bg-surface-card text-primary-container shadow-card"
          aria-hidden="true"
        >
          <Icon icon={Upload} size="md" />
        </div>
        <div className="flex min-w-0 flex-col items-center gap-xs">
          <p className="text-label-lg text-on-surface">
            {arrastando ? "Solte o arquivo aqui" : "Arraste o arquivo aqui"}
          </p>
          <p className="text-body-sm text-on-surface-variant">ou escolha no computador</p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={processando}
          onClick={(event) => {
            event.stopPropagation();
            onEscolher();
          }}
        >
          <Icon icon={Upload} size="sm" />
          Escolher arquivo
        </Button>
      </div>
      <SheetHelpText className="w-full min-w-0 [&>span]:truncate" title={descricao}>
        {descricao}
      </SheetHelpText>
    </div>
  );
}
