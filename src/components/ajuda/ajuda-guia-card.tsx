import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { AjudaCapturaTela } from "@/components/ajuda/ajuda-captura-tela";
import { Icon } from "@/components/icon";
import type { GuiaManual } from "@/lib/ajuda/manual-guias";

type AjudaGuiaCardProps = {
  guia: GuiaManual;
};

export function AjudaGuiaCard({ guia }: AjudaGuiaCardProps) {
  return (
    <Link
      href={`/ajuda/guia/${guia.id}`}
      className="group flex h-full w-full min-w-0 flex-col overflow-hidden rounded-xl border border-border-subtle bg-surface-card shadow-card transition-[border-color,box-shadow] hover:border-primary-container/30 hover:shadow-popover focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brass"
    >
      <AjudaCapturaTela capturaId={guia.id} titulo={guia.titulo} variante="cover" />

      <div className="flex min-w-0 flex-1 flex-col gap-xs p-md">
        <h3 className="flex min-w-0 items-center gap-xs">
          <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-fixed/45 text-primary-container">
            <Icon icon={guia.icon} size="sm" aria-hidden />
          </span>
          <span className="min-w-0 flex-1 truncate text-label-md font-bold text-on-surface">{guia.titulo}</span>
        </h3>

        <p className="line-clamp-2 text-body-sm leading-snug text-on-surface-variant">{guia.resumo}</p>

        <span className="inline-flex w-fit items-center gap-xs text-label-sm font-semibold text-primary-container">
          Ver passo a passo
          <Icon
            icon={ChevronRight}
            size="sm"
            className="transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </span>
      </div>
    </Link>
  );
}
