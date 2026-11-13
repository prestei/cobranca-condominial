import Image from "next/image";
import { capturaAjudaSrc } from "@/lib/ajuda/captura-path";

type AjudaCapturaTelaProps = {
  /** Id do guia (nome do arquivo sem extensão). */
  capturaId: string;
  titulo: string;
  className?: string;
  /** Miniatura nos cards do índice. */
  variante?: "hero" | "card" | "thumb";
  priority?: boolean;
};

const dimensoes = { width: 1440, height: 900 } as const;

export function AjudaCapturaTela({
  capturaId,
  titulo,
  className,
  variante = "hero",
  priority = false,
}: AjudaCapturaTelaProps) {
  const src = capturaAjudaSrc(capturaId);
  const alt = `Captura real da tela ${titulo}`;

  const frameClass =
    variante === "card"
      ? "overflow-hidden [&_img]:max-h-[168px] [&_img]:w-full [&_img]:object-cover [&_img]:object-top"
      : variante === "thumb"
        ? "overflow-hidden [&_img]:max-h-[120px] [&_img]:w-full [&_img]:object-cover [&_img]:object-top"
        : "";

  return (
    <figure
      className={`overflow-hidden rounded-card border border-outline-variant bg-surface-muted/30 shadow-card ${frameClass} ${className ?? ""}`}
    >
      <Image
        src={src}
        alt={alt}
        width={dimensoes.width}
        height={dimensoes.height}
        priority={priority}
        sizes={
          variante === "hero"
            ? "(min-width: 1024px) 50vw, 100vw"
            : variante === "card"
              ? "(min-width: 768px) 33vw, 100vw"
              : "200px"
        }
        className="h-auto w-full bg-surface-muted"
      />
      <figcaption className="sr-only">{alt}</figcaption>
    </figure>
  );
}
