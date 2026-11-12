"use client";

import { useCallback, useEffect, useState } from "react";
import { SkeletonTimeline } from "@/components/skeleton";
import { formatarData, hojeIso } from "@/data/catalogo";
import { formatarProximoRetorno } from "@/lib/fila/formatar-proximo-retorno";
import type { EventoHistoricoUnidade } from "@/lib/historico-unidade/service";

type Props = {
  unidadeId: number | null;
};

function rotuloEvento(evento: EventoHistoricoUnidade): string {
  if (evento.tipo === "retorno_concluido") return "Retorno concluído";
  if (evento.titulo.toLowerCase().includes("retorno")) return "Retorno agendado";
  if (evento.tipo === "tentativa") return "Atendimento registrado";
  if (evento.tipo === "redistribuicao") return "Distribuição de carteira";
  return evento.titulo;
}

function detalheEvento(evento: EventoHistoricoUnidade): string {
  if (evento.proximoPasso?.trim()) {
    const proximo = formatarProximoRetorno(evento.proximoPasso);
    if (proximo !== "—") return proximo;
  }
  return formatarData(evento.dataHora);
}

export function AtendimentoLinhaTempoCompacta({ unidadeId }: Props) {
  const [eventos, setEventos] = useState<EventoHistoricoUnidade[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    if (unidadeId === null) return;
    setCarregando(true);
    setErro(null);
    try {
      const response = await fetch(`/api/unidades/${unidadeId}/historico`, { credentials: "same-origin" });
      const payload = (await response.json()) as { error?: string; eventos?: EventoHistoricoUnidade[] };
      if (!response.ok) {
        setEventos([]);
        setErro(payload.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      setEventos((payload.eventos ?? []).slice(0, 6));
    } catch {
      setEventos([]);
      setErro("Erro ao carregar a linha do tempo.");
    } finally {
      setCarregando(false);
    }
  }, [unidadeId]);

  useEffect(() => {
    if (unidadeId === null) {
      setEventos([]);
      setErro(null);
      return;
    }
    void carregar();
  }, [carregar, unidadeId]);

  if (unidadeId === null) {
    return <p className="text-[13px] text-[#51606f]">Selecione uma unidade na fila para ver o histórico.</p>;
  }

  if (carregando) {
    return <SkeletonTimeline items={3} label="Carregando linha do tempo" />;
  }

  if (erro) {
    return <p className="text-[13px] text-error">{erro}</p>;
  }

  if (eventos.length === 0) {
    return <p className="text-[13px] text-[#51606f]">Nenhum evento registrado ainda.</p>;
  }

  const hoje = hojeIso();

  return (
    <ol className="flex flex-col" aria-label="Linha do tempo">
      {eventos.map((evento, index) => {
        const retorno =
          Boolean(evento.proximoPasso?.trim()) &&
          (evento.titulo.toLowerCase().includes("retorno") || evento.tipo === "retorno_concluido");
        const recente = evento.dataHora.slice(0, 10) === hoje;
        const esmaecido = !retorno && !recente;

        return (
          <li
            key={evento.id}
            className={`relative mb-[18px] pl-7 last:mb-0 ${esmaecido ? "text-[#51606f]" : ""}`}
          >
            <span
              className={`absolute left-0 top-[3px] size-3 rounded-full ${
                retorno
                  ? "border-2 border-[#b7791f] bg-white"
                  : recente
                    ? "bg-[#1e3248]"
                    : "bg-[#cfd8e1]"
              }`}
              aria-hidden
            />
            <p className={`text-[14px] font-semibold ${esmaecido ? "text-[#51606f]" : "text-[#1b2a3a]"}`}>
              {rotuloEvento(evento)}
            </p>
            <p className="text-[13px] text-[#51606f]">{detalheEvento(evento)}</p>
            {index < eventos.length - 1 ? (
              <span className="absolute left-[5px] top-5 bottom-[-14px] w-px bg-[#e5eaf0]" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
