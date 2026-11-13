function escalaTextoUnidadeCirculo(identificacao: string): string {
  const len = identificacao.trim().length;
  if (len <= 3) return "text-label-lg";
  if (len <= 5) return "text-[11px]";
  if (len <= 7) return "text-[10px]";
  return "text-[9px]";
}

type Props = {
  identificacao: string;
  className?: string;
};

/** Círculo com a identificação da unidade (ex.: header do painel de caso). */
export function UnidadeIdentificacaoCirculo({ identificacao, className }: Props) {
  return (
    <div
      className={`flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-container px-1 text-on-primary ${className ?? ""}`}
      aria-label={`Unidade ${identificacao}`}
    >
      <span
        className={`text-center font-semibold leading-none tabular-nums ${escalaTextoUnidadeCirculo(identificacao)}`}
      >
        {identificacao}
      </span>
    </div>
  );
}
