"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/button";
import { Icon } from "@/components/icon";
import { hojeIso } from "@/data/catalogo";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { RetornoAgendaItem } from "@/lib/retornos/service";

type Props = {
  itens: RetornoAgendaItem[];
  onSelecionar: (item: RetornoAgendaItem) => void;
};

const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function gradeDoMes(ano: number, mes: number) {
  const primeiro = new Date(ano, mes, 1);
  const offset = primeiro.getDay();
  const diasNoMes = new Date(ano, mes + 1, 0).getDate();
  const celulas: Array<{ dia: number | null; chave: string }> = [];
  for (let i = 0; i < offset; i++) {
    celulas.push({ dia: null, chave: `e-${i}` });
  }
  for (let d = 1; d <= diasNoMes; d++) {
    celulas.push({ dia: d, chave: `d-${d}` });
  }
  while (celulas.length % 7 !== 0) {
    celulas.push({ dia: null, chave: `t-${celulas.length}` });
  }
  return celulas;
}

function classesCelula(ehHoje: boolean, temAtrasado: boolean) {
  const base = "flex min-h-[5.5rem] flex-col gap-xs rounded-md border p-xs";
  if (ehHoje) return `${base} border-primary bg-primary-subtle/30`;
  if (temAtrasado) return `${base} border-error/60 bg-error-subtle/20`;
  return `${base} border-outline-variant bg-surface`;
}

export function RetornosCalendarioMes({ itens, onSelecionar }: Props) {
  const hoje = hojeIso();
  const [ano, setAno] = useState(() => Number(hoje.slice(0, 4)));
  const [mes, setMes] = useState(() => Number(hoje.slice(5, 7)) - 1);

  const porDia = useMemo(() => {
    const mapa = new Map<string, RetornoAgendaItem[]>();
    for (const item of itens) {
      const chave = item.dataPrevista.slice(0, 10);
      const lista = mapa.get(chave) ?? [];
      lista.push(item);
      mapa.set(chave, lista);
    }
    for (const lista of mapa.values()) {
      lista.sort((a, b) => a.dataPrevista.localeCompare(b.dataPrevista));
    }
    return mapa;
  }, [itens]);

  const celulas = useMemo(() => gradeDoMes(ano, mes), [ano, mes]);
  const rotuloMes = useMemo(
    () => new Date(ano, mes, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" }),
    [ano, mes],
  );

  function mudarMes(delta: number) {
    const data = new Date(ano, mes + delta, 1);
    setAno(data.getFullYear());
    setMes(data.getMonth());
  }

  return (
    <section className="flex flex-col gap-md rounded-card border border-outline-variant bg-surface-card p-md shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-sm">
        <h2 className="text-title-sm font-semibold capitalize text-on-surface">{rotuloMes}</h2>
        <div className="inline-flex gap-xs">
          <Button type="button" variant="ghost" size="sm" aria-label="Mês anterior" onClick={() => mudarMes(-1)}>
            <Icon icon={ChevronLeft} size="sm" />
          </Button>
          <Button type="button" variant="ghost" size="sm" aria-label="Próximo mês" onClick={() => mudarMes(1)}>
            <Icon icon={ChevronRight} size="sm" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-xs text-center text-body-sm font-medium text-on-surface-variant">
        {diasSemana.map((dia) => (
          <div key={dia} className="py-xs">
            {dia}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-xs">
        {celulas.map((celula) => {
          if (celula.dia === null) {
            return <div key={celula.chave} className="min-h-[5.5rem] rounded-md bg-surface-subtle/40" aria-hidden />;
          }
          const chaveDia = `${ano}-${String(mes + 1).padStart(2, "0")}-${String(celula.dia).padStart(2, "0")}`;
          const eventos = porDia.get(chaveDia) ?? [];
          const ehHoje = chaveDia === hoje;
          const temAtrasado = eventos.some((item) => item.situacaoAgenda === "atrasado");

          return (
            <div key={celula.chave} className={classesCelula(ehHoje, temAtrasado)}>
              <span
                className={
                  ehHoje
                    ? "text-body-sm font-semibold tabular-nums text-primary"
                    : "text-body-sm font-semibold tabular-nums text-on-surface"
                }
              >
                {celula.dia}
              </span>
              <ul className="flex flex-1 flex-col gap-px overflow-hidden">
                {eventos.slice(0, 3).map((item) => (
                  <li key={item.atendimentoId}>
                    <button
                      type="button"
                      className="w-full truncate rounded-sm px-xs py-px text-left text-[11px] leading-tight text-on-surface-variant hover:bg-surface-subtle hover:text-on-surface"
                      onClick={() => onSelecionar(item)}
                      title={`${item.unidadeLabel} · ${formatarProximoRetorno(item.dataPrevista)}`}
                    >
                      <span className="font-medium text-on-surface">{item.codigoRe ?? "—"}</span> {item.unidadeLabel}
                    </button>
                  </li>
                ))}
                {eventos.length > 3 ? (
                  <li className="text-[10px] text-on-surface-variant">+{eventos.length - 3} mais</li>
                ) : null}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
