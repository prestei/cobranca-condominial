"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export type TomGrafico = "navy" | "brass" | "settled" | "pending" | "critical" | "mist";

const preenchimento: Record<TomGrafico, string> = {
  navy: "bg-primary-container",
  brass: "bg-brass",
  settled: "bg-status-settled",
  pending: "bg-status-pending",
  critical: "bg-status-critical",
  mist: "bg-inverse-primary",
};

const traco: Record<TomGrafico, string> = {
  navy: "stroke-primary-container",
  brass: "stroke-brass",
  settled: "stroke-status-settled",
  pending: "stroke-status-pending",
  critical: "stroke-status-critical",
  mist: "stroke-inverse-primary",
};

const tons: TomGrafico[] = ["navy", "brass", "settled", "pending", "critical", "mist"];

export function tomPorIndice(indice: number): TomGrafico {
  return tons[indice % tons.length] ?? "navy";
}

function casa(valor: number) {
  return Math.round(valor * 100) / 100;
}

function useProgresso(chave: string) {
  const [progresso, setProgresso] = useState(0);

  useEffect(() => {
    const reduzir = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduzir) {
      setProgresso(1);
      return;
    }

    let quadro = 0;
    const inicio = performance.now();
    const passo = (agora: number) => {
      const t = Math.min(1, (agora - inicio) / 900);
      setProgresso(1 - (1 - t) ** 3);
      if (t < 1) quadro = requestAnimationFrame(passo);
    };

    setProgresso(0);
    quadro = requestAnimationFrame(passo);
    return () => cancelAnimationFrame(quadro);
  }, [chave]);

  return progresso;
}

function avanco(progresso: number, indice: number) {
  return Math.min(1, Math.max(0, progresso * 1.2 - indice * 0.045));
}

function ListaOculta({ itens }: { itens: Array<{ nome: string; detalhe: string }> }) {
  return (
    <ul className="sr-only">
      {itens.map((item) => (
        <li key={item.nome}>
          {item.nome}: {item.detalhe}
        </li>
      ))}
    </ul>
  );
}

export function GraficoBarras({
  itens,
  vazio,
  chave,
}: {
  itens: Array<{ nome: string; valor: number; detalhe: string; tom?: TomGrafico }>;
  vazio: ReactNode;
  chave: string;
}) {
  const progresso = useProgresso(chave);
  const maximo = Math.max(...itens.map((item) => item.valor), 0);
  if (itens.length === 0 || maximo <= 0) return vazio;

  return (
    <div>
      <ul className="flex flex-col gap-md" aria-hidden="true">
        {itens.map((item, indice) => {
          const largura = item.valor <= 0 ? 0 : Math.max(2, (item.valor / maximo) * 100) * avanco(progresso, indice);
          return (
            <li key={item.nome} className="flex flex-col gap-xs" title={`${item.nome}: ${item.detalhe}`}>
              <div className="flex items-baseline justify-between gap-sm">
                <span className="truncate text-body-md text-on-surface">{item.nome}</span>
                <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{item.detalhe}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-surface-subtle">
                <div className={`h-full rounded-full ${preenchimento[item.tom ?? "navy"]}`} style={{ width: `${casa(largura)}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: item.detalhe }))} />
    </div>
  );
}

export function GraficoColunas({
  itens,
  vazio,
  chave,
}: {
  itens: Array<{ nome: string; valor: number; rotulo: string; tom?: TomGrafico }>;
  vazio: ReactNode;
  chave: string;
}) {
  const progresso = useProgresso(chave);
  const maximo = Math.max(...itens.map((item) => item.valor), 0);
  if (itens.length === 0 || maximo <= 0) return vazio;

  return (
    <div>
      <div className="flex h-56 items-end gap-md overflow-x-auto pb-xs" aria-hidden="true">
        {itens.map((item, indice) => {
          const altura = item.valor <= 0 ? 0 : Math.max(6, (item.valor / maximo) * 100) * avanco(progresso, indice);
          return (
            <div key={`${item.nome}-${indice}`} className="flex w-16 shrink-0 flex-col items-center gap-xs" title={`${item.nome}: ${item.rotulo}`}>
              <span className="max-w-full truncate text-center text-body-sm tabular-nums text-on-surface">{item.rotulo}</span>
              <div className="flex h-40 w-full items-end">
                <div className={`w-full rounded-t-md ${preenchimento[item.tom ?? "navy"]}`} style={{ height: `${casa(altura)}%` }} />
              </div>
              <span className="line-clamp-2 w-full text-center text-body-sm text-on-surface-variant">{item.nome}</span>
            </div>
          );
        })}
      </div>
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: item.rotulo }))} />
    </div>
  );
}

export function GraficoEmpilhado({
  itens,
  vazio,
  chave,
  legenda,
}: {
  itens: Array<{ nome: string; ate: number; acima: number; detalhe: string }>;
  vazio: ReactNode;
  chave: string;
  legenda?: { ate: string; acima: string };
}) {
  const progresso = useProgresso(chave);
  const maximo = Math.max(...itens.map((item) => item.ate + item.acima), 0);
  const rotulos = legenda ?? { ate: "Até 60 dias", acima: "Acima de 60 dias" };

  return (
    <div className="flex flex-col gap-md">
      <p className="flex flex-wrap gap-md text-body-sm text-on-surface-variant">
        <span className="inline-flex items-center gap-xs">
          <span className="size-2.5 rounded-full bg-brass" />
          {rotulos.ate}
        </span>
        <span className="inline-flex items-center gap-xs">
          <span className="size-2.5 rounded-full bg-primary-container" />
          {rotulos.acima}
        </span>
      </p>
      {itens.length === 0 || maximo <= 0 ? (
        vazio
      ) : (
        <ul className="flex flex-col gap-md">
          {itens.map((item, indice) => {
            const soma = item.ate + item.acima;
            const largura = (soma / maximo) * 100 * avanco(progresso, indice);
            const parteAte = soma > 0 ? (item.ate / soma) * 100 : 0;
            return (
              <li key={item.nome} className="flex flex-col gap-xs" title={`${item.nome}: ${item.detalhe}`}>
                <div className="flex items-baseline justify-between gap-sm">
                  <span className="truncate text-body-md text-on-surface">{item.nome}</span>
                  <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{item.detalhe}</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-surface-subtle">
                  <div className="flex h-full" style={{ width: `${casa(largura)}%` }}>
                    <div className="h-full bg-brass" style={{ width: `${casa(parteAte)}%` }} />
                    <div className="h-full bg-primary-container" style={{ width: `${casa(100 - parteAte)}%` }} />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function GraficoRosca({
  fatias,
  centro,
  legenda,
  vazio,
  chave,
}: {
  fatias: Array<{ nome: string; valor: number; detalhe: string; tom?: TomGrafico }>;
  centro: string;
  legenda: string;
  vazio: ReactNode;
  chave: string;
}) {
  const progresso = useProgresso(chave);
  const ativas = fatias.filter((fatia) => fatia.valor > 0);
  const total = ativas.reduce((soma, fatia) => soma + fatia.valor, 0);
  if (ativas.length === 0 || total <= 0) return vazio;

  const raio = 58;
  const circunferencia = casa(2 * Math.PI * raio);
  const folga = ativas.length > 1 ? 4 : 0;
  let percorrido = 0;

  return (
    <div className="flex flex-col items-center gap-lg min-[768px]:flex-row min-[768px]:items-center">
      <svg viewBox="0 0 160 160" className="size-44 shrink-0" role="img" aria-label={`${legenda}: ${centro}`}>
        <g transform="rotate(-90 80 80)">
          <circle cx="80" cy="80" r={raio} className="fill-none stroke-surface-subtle" strokeWidth="16" />
          {ativas.map((fatia, indice) => {
            const bruto = casa((fatia.valor / total) * circunferencia);
            const comprimento = casa(Math.max(0, bruto - folga) * progresso);
            const deslocamento = percorrido;
            percorrido = casa(percorrido + bruto);
            return (
              <circle
                key={fatia.nome}
                cx="80"
                cy="80"
                r={raio}
                fill="none"
                strokeWidth="16"
                strokeLinecap="butt"
                className={traco[fatia.tom ?? tomPorIndice(indice)]}
                strokeDasharray={`${comprimento} ${circunferencia}`}
                strokeDashoffset={-deslocamento}
              />
            );
          })}
        </g>
        <text x="80" y="76" textAnchor="middle" className="fill-on-surface font-sans text-[18px] font-semibold">
          {centro}
        </text>
        <text x="80" y="96" textAnchor="middle" className="fill-on-surface-variant font-sans text-[11px]">
          {legenda}
        </text>
      </svg>
      <ul className="flex w-full min-w-0 flex-col gap-sm">
        {fatias.map((fatia, indice) => (
          <li key={fatia.nome} className="flex items-center justify-between gap-md">
            <span className="flex min-w-0 items-center gap-sm">
              <span className={`size-2.5 shrink-0 rounded-full ${preenchimento[fatia.tom ?? tomPorIndice(indice)]}`} />
              <span className="truncate text-body-md text-on-surface">{fatia.nome}</span>
            </span>
            <span className="shrink-0 text-body-sm tabular-nums text-on-surface-variant">{fatia.detalhe}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GraficoLinha({
  itens,
  vazio,
  chave,
}: {
  itens: Array<{ nome: string; valor: number; rotulo: string }>;
  vazio: ReactNode;
  chave: string;
}) {
  const progresso = useProgresso(chave);
  const maximo = Math.max(...itens.map((item) => item.valor), 0);
  if (itens.length === 0 || maximo <= 0) return vazio;

  const largura = 640;
  const altura = 200;
  const margem = { topo: 16, direita: 16, base: 32, esquerda: 16 };
  const internoLargura = largura - margem.esquerda - margem.direita;
  const internoAltura = altura - margem.topo - margem.base;
  const pontos = itens.map((item, indice) => {
    const x = margem.esquerda + (itens.length === 1 ? internoLargura / 2 : (indice / (itens.length - 1)) * internoLargura);
    const y = margem.topo + internoAltura - (item.valor / maximo) * internoAltura * progresso;
    return { ...item, x: casa(x), y: casa(y) };
  });
  const linha = pontos.map((ponto, indice) => `${indice === 0 ? "M" : "L"} ${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`).join(" ");
  const base = margem.topo + internoAltura;
  const area = `${linha} L ${pontos[pontos.length - 1]?.x.toFixed(1)} ${base} L ${pontos[0]?.x.toFixed(1)} ${base} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${largura} ${altura}`} className="h-52 w-full" role="img" aria-label="Evolução dos valores em aberto por referência">
        <path d={area} className="fill-primary-container opacity-10" />
        <path d={linha} fill="none" className="stroke-primary-container" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {pontos.map((ponto) => (
          <g key={ponto.nome}>
            <circle cx={ponto.x} cy={ponto.y} r="4.5" className="fill-surface-card stroke-brass" strokeWidth="2.5" />
            <text x={ponto.x} y={altura - 8} textAnchor="middle" className="fill-on-surface-variant font-sans text-[11px]">
              {ponto.nome}
            </text>
          </g>
        ))}
      </svg>
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: item.rotulo }))} />
    </div>
  );
}

function intensidadeCalor(valor: number, maximo: number) {
  if (valor <= 0 || maximo <= 0) return 0.06;
  return 0.18 + (valor / maximo) * 0.82;
}

export function GraficoCalor({
  celulas,
  dias,
  horas,
  vazio,
  chave,
}: {
  celulas: Array<{ x: number; y: number; v: number }>;
  dias: string[];
  horas: number[];
  vazio: ReactNode;
  chave: string;
}) {
  const progresso = useProgresso(chave);
  const mapa = new Map(celulas.map((celula) => [`${celula.y}-${celula.x}`, celula.v]));
  const maximo = Math.max(...celulas.map((celula) => celula.v), 0);
  if (maximo <= 0) return vazio;

  return (
    <div className="flex flex-col gap-md">
      <div className="overflow-x-auto">
        <div
          className="inline-grid min-w-full gap-1"
          style={{ gridTemplateColumns: `3.5rem repeat(${horas.length}, minmax(2.25rem, 1fr))` }}
          aria-hidden="true"
        >
          <div />
          {horas.map((hora) => (
            <div key={`h-${hora}`} className="pb-xs text-center text-label-sm text-on-surface-variant">
              {hora}h
            </div>
          ))}
          {dias.map((dia, indiceDia) => (
            <div key={dia} className="contents">
              <div className="flex items-center pr-sm text-body-sm font-medium text-on-surface">{dia}</div>
              {horas.map((hora) => {
                const valor = mapa.get(`${indiceDia}-${hora}`) ?? 0;
                const alpha = intensidadeCalor(valor, maximo) * progresso;
                return (
                  <div
                    key={`${indiceDia}-${hora}`}
                    title={`${dia}, ${hora}h — ${valor} atendimento${valor === 1 ? "" : "s"}`}
                    className="aspect-square min-h-7 rounded-sm border border-border-subtle/40 bg-primary-container"
                    style={{ opacity: Math.max(0.08, alpha) }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <p className="flex flex-wrap items-center gap-sm text-body-sm text-on-surface-variant">
        <span>Menos contatos</span>
        <span className="h-2.5 w-28 rounded-full bg-gradient-to-r from-surface-subtle via-primary-container/40 to-primary-container" />
        <span>Mais contatos</span>
      </p>
      <ListaOculta
        itens={celulas
          .filter((celula) => celula.v > 0)
          .map((celula) => ({
            nome: `${dias[celula.y] ?? ""} ${celula.x}h`,
            detalhe: String(celula.v),
          }))}
      />
    </div>
  );
}
