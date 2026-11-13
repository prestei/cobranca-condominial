"use client";

import Image from "next/image";
import { Expand, ImageOff } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/dialog";
import { Icon } from "@/components/icon";
import { capturaAjudaSrc } from "@/lib/ajuda/captura-path";

type AjudaCapturaTelaProps = {
  /** Id do guia (nome do arquivo sem extensão). */
  capturaId: string;
  titulo: string;
  className?: string;
  /** `hero` na página do guia (prévia + ampliar); `cover` no card do índice. */
  variante?: "hero" | "card" | "thumb" | "cover";
  priority?: boolean;
};

const dimensoes = { width: 1440, height: 900 } as const;

const sizesPorVariante = {
  hero: "(min-width: 1024px) 720px, 100vw",
  card: "(min-width: 768px) 320px, 100vw",
  thumb: "280px",
  cover: "(min-width: 768px) 33vw, 100vw",
} as const;

function MolduraNavegador({
  children,
  className,
  chromeClassName,
}: {
  children: ReactNode;
  className?: string;
  chromeClassName?: string;
}) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-outline-variant bg-surface-muted/30 shadow-card ${className ?? ""}`}
    >
      <div
        className={`flex items-center gap-1.5 border-b border-border-subtle bg-surface-muted px-sm py-xs ${chromeClassName ?? ""}`}
        aria-hidden
      >
        <span className="size-2.5 rounded-full bg-status-error/75" />
        <span className="size-2.5 rounded-full bg-status-pending/90" />
        <span className="size-2.5 rounded-full bg-status-success/80" />
        <span className="ml-xs h-5 min-w-0 flex-1 rounded-md bg-surface-card/80" />
      </div>
      {children}
    </div>
  );
}

type CapturaImagemProps = {
  src: string;
  alt: string;
  sizes: string;
  priority?: boolean;
  className?: string;
};

function CapturaImagem({ src, alt, sizes, priority, className }: CapturaImagemProps) {
  const [indisponivel, setIndisponivel] = useState(false);

  if (indisponivel) {
    return (
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-xs bg-gradient-to-br from-primary-fixed/35 via-surface-muted to-surface-subtle px-sm text-center"
        role="img"
        aria-label={alt}
      >
        <Icon icon={ImageOff} size="md" className="text-on-surface-variant/80" aria-hidden />
        <span className="text-label-sm font-medium text-on-surface-variant">Captura em breve</span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      fill
      unoptimized
      priority={priority}
      quality={90}
      sizes={sizes}
      className={className}
      onError={() => setIndisponivel(true)}
    />
  );
}

export function AjudaCapturaTela({
  capturaId,
  titulo,
  className,
  variante = "hero",
  priority = false,
}: AjudaCapturaTelaProps) {
  const [ampliado, setAmpliado] = useState(false);
  const src = capturaAjudaSrc(capturaId);
  const alt = `Captura real da tela ${titulo}`;

  if (variante === "cover") {
    return (
      <figure
        className={`relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-border-subtle bg-surface-muted ${className ?? ""}`}
      >
        <CapturaImagem
          src={src}
          alt={alt}
          priority={priority}
          sizes={sizesPorVariante.cover}
          className="object-cover object-top"
        />
        <figcaption className="sr-only">{alt}</figcaption>
      </figure>
    );
  }

  const areaPreviaClass =
    variante === "card"
      ? "relative h-[168px] w-full bg-surface-muted"
      : variante === "thumb"
        ? "relative h-[120px] w-full bg-surface-muted"
        : "relative h-[min(48vh,20rem)] min-h-[11rem] w-full bg-surface-muted";

  const figura = (
    <figure className={className}>
      <MolduraNavegador>
        <div className={areaPreviaClass}>
          <CapturaImagem
            src={src}
            alt={alt}
            priority={priority}
            sizes={sizesPorVariante[variante]}
            className="object-contain object-top"
          />
        </div>
      </MolduraNavegador>
      {variante === "hero" ? (
        <div className="mt-sm flex flex-wrap items-center justify-between gap-sm">
          <p className="text-body-sm text-on-surface-variant">
            Prévia da tela — detalhes ficam nítidos ao ampliar.
          </p>
          <Button type="button" size="sm" variant="secondary" onClick={() => setAmpliado(true)}>
            <Icon icon={Expand} size="sm" className="mr-xs" aria-hidden />
            Ampliar captura
          </Button>
        </div>
      ) : null}
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );

  return (
    <>
      {figura}
      {variante === "hero" ? (
        <Dialog open={ampliado} onOpenChange={setAmpliado}>
          <DialogContent
            className="open:w-[min(96vw,64rem)] max-h-[min(92vh,56rem)] overflow-hidden sm:max-w-none"
            aria-label={`Captura ampliada: ${titulo}`}
          >
            <DialogHeader>
              <DialogTitle className="text-title-md">{titulo}</DialogTitle>
            </DialogHeader>
            <DialogBody className="max-h-[calc(92vh-9rem)] overflow-y-auto px-md pb-md pt-0">
              {/* PNG estático em resolução original — sem redimensionamento do otimizador */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={alt} width={dimensoes.width} height={dimensoes.height} className="h-auto w-full" />
            </DialogBody>
            <DialogFooter>
              <Button type="button" size="sm" variant="ghost" onClick={() => setAmpliado(false)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}
    </>
  );
}
