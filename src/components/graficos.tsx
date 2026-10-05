"use client";

import { useMemo } from "react";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import type { Plugin, ScriptableContext } from "chart.js";
import { MatrixController, MatrixElement } from "chartjs-chart-matrix";
import { Bar, Chart, Doughnut, Line } from "react-chartjs-2";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend, MatrixController, MatrixElement);

const navy = "#203347";
const brass = "#eaa015";
const settled = "#1d7c4d";
const pending = "#d98200";
const critical = "#b3261e";
const mist = "#b5c8e2";
const grade = "#dde3ea";
const texto = "#43474c";
const superficie = "#edf1f5";
const fonte = { family: "Open Sans, sans-serif" };

export const paleta = [navy, brass, settled, pending, critical, mist];

const pluginCentro: Plugin = {
  id: "centroRelatorio",
  afterDraw(grafico) {
    const opcoes = grafico.options.plugins as { centroRelatorio?: { texto?: string } } | undefined;
    const rotulo = opcoes?.centroRelatorio?.texto;
    if (!rotulo) return;
    const meta = grafico.getDatasetMeta(0);
    const primeiro = meta.data[0] as { x?: number; y?: number } | undefined;
    if (!primeiro || primeiro.x === undefined || primeiro.y === undefined) return;
    const ctx = grafico.ctx;
    ctx.save();
    ctx.fillStyle = "#181c20";
    ctx.font = "600 16px Open Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(rotulo, primeiro.x, primeiro.y);
    ctx.restore();
  },
};

ChartJS.register(pluginCentro);

const animacao = { duration: 900, easing: "easeOutQuart" as const };

function escalaX() {
  return {
    grid: { display: false },
    ticks: { color: texto, font: { ...fonte, size: 11 } },
    border: { display: false },
  };
}

function escalaY(inteiro = false) {
  return {
    beginAtZero: true,
    grid: { color: grade },
    ticks: { color: texto, font: { ...fonte, size: 11 }, precision: inteiro ? 0 : undefined },
    border: { display: false },
  };
}

export type PontoGrafico = { nome: string; valor: number; cor?: string };

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

export function GraficoColunas({ itens, chave }: { itens: PontoGrafico[]; chave: string }) {
  const visiveis = itens.filter((item) => item.valor > 0);
  const data = useMemo(
    () => ({
      labels: itens.map((item) => item.nome),
      datasets: [
        {
          data: itens.map((item) => item.valor),
          backgroundColor: itens.map((item) => item.cor ?? navy),
          borderRadius: 6,
          maxBarThickness: 36,
        },
      ],
    }),
    [itens],
  );
  if (visiveis.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <Bar
        key={chave}
        data={data}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: animacao,
          plugins: { legend: { display: false }, tooltip: { bodyFont: fonte, titleFont: fonte } },
          scales: { x: escalaX(), y: escalaY(true) },
        }}
      />
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: String(item.valor) }))} />
    </div>
  );
}

export function GraficoBarras({ itens, chave }: { itens: PontoGrafico[]; chave: string }) {
  const visiveis = itens.filter((item) => item.valor > 0);
  if (visiveis.length === 0) return null;
  return (
    <div className="w-full" style={{ height: Math.max(160, itens.length * 36) }}>
      <Bar
        key={chave}
        data={{
          labels: itens.map((item) => item.nome),
          datasets: [
            {
              data: itens.map((item) => item.valor),
              backgroundColor: itens.map((item) => item.cor ?? navy),
              borderRadius: 6,
              maxBarThickness: 18,
            },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          animation: animacao,
          plugins: { legend: { display: false }, tooltip: { bodyFont: fonte, titleFont: fonte } },
          scales: { x: { ...escalaY(), grid: { color: grade } }, y: { grid: { display: false }, ticks: { color: texto, font: { ...fonte, size: 12 } }, border: { display: false } } },
        }}
      />
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: String(item.valor) }))} />
    </div>
  );
}

export function GraficoRosca({ fatias, centro, chave }: { fatias: PontoGrafico[]; centro?: string; chave: string }) {
  const visiveis = fatias.filter((item) => item.valor > 0);
  if (visiveis.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <Doughnut
        key={chave}
        data={{
          labels: visiveis.map((item) => item.nome),
          datasets: [
            {
              data: visiveis.map((item) => item.valor),
              backgroundColor: visiveis.map((item, indice) => item.cor ?? paleta[indice % paleta.length]),
              borderWidth: 0,
              hoverOffset: 6,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          cutout: "68%",
          animation: animacao,
          plugins: {
            legend: { position: "bottom", labels: { color: texto, font: fonte, boxWidth: 10, padding: 12 } },
            tooltip: { bodyFont: fonte, titleFont: fonte },
            centroRelatorio: { texto: centro ?? "" },
          },
        }}
      />
      <ListaOculta itens={visiveis.map((item) => ({ nome: item.nome, detalhe: String(item.valor) }))} />
    </div>
  );
}

export function GraficoLinha({ itens, chave }: { itens: PontoGrafico[]; chave: string }) {
  const visiveis = itens.filter((item) => item.valor > 0);
  if (visiveis.length === 0) return null;
  return (
    <div className="h-64 w-full">
      <Line
        key={chave}
        data={{
          labels: itens.map((item) => item.nome),
          datasets: [
            {
              data: itens.map((item) => item.valor),
              borderColor: navy,
              backgroundColor: "rgba(32, 51, 71, 0.12)",
              fill: true,
              tension: 0.35,
              pointBackgroundColor: brass,
              pointBorderColor: "#ffffff",
              pointBorderWidth: 2,
              pointRadius: 4,
            },
          ],
        }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          animation: animacao,
          plugins: { legend: { display: false }, tooltip: { bodyFont: fonte, titleFont: fonte } },
          scales: { x: escalaX(), y: escalaY() },
        }}
      />
      <ListaOculta itens={itens.map((item) => ({ nome: item.nome, detalhe: String(item.valor) }))} />
    </div>
  );
}

export function GraficoEmpilhado({
  itens,
  chave,
}: {
  itens: Array<{ nome: string; ate: number; acima: number }>;
  chave: string;
}) {
  const visiveis = itens.filter((item) => item.ate + item.acima > 0);
  if (visiveis.length === 0) return null;
  return (
    <div className="w-full" style={{ height: Math.max(180, visiveis.length * 42) }}>
      <Bar
        key={chave}
        data={{
          labels: visiveis.map((item) => item.nome),
          datasets: [
            { label: "Até 60 dias", data: visiveis.map((item) => item.ate), backgroundColor: brass, stack: "fase", borderRadius: 4, maxBarThickness: 18 },
            { label: "Acima de 60 dias", data: visiveis.map((item) => item.acima), backgroundColor: navy, stack: "fase", borderRadius: 4, maxBarThickness: 18 },
          ],
        }}
        options={{
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          animation: animacao,
          plugins: { legend: { position: "bottom", labels: { color: texto, font: fonte, boxWidth: 10 } }, tooltip: { bodyFont: fonte, titleFont: fonte } },
          scales: {
            x: { stacked: true, beginAtZero: true, grid: { color: grade }, ticks: { color: texto, font: { ...fonte, size: 11 } }, border: { display: false } },
            y: { stacked: true, grid: { display: false }, ticks: { color: texto, font: { ...fonte, size: 12 } }, border: { display: false } },
          },
        }}
      />
    </div>
  );
}

function corCalor(valor: number, maximo: number) {
  if (valor <= 0 || maximo <= 0) return superficie;
  const forca = 0.28 + (valor / maximo) * 0.72;
  return `rgba(32, 51, 71, ${forca.toFixed(2)})`;
}

export function GraficoCalor({
  celulas,
  dias,
  horas,
  chave,
}: {
  celulas: Array<{ x: number; y: number; v: number }>;
  dias: string[];
  horas: number[];
  chave: string;
}) {
  const maximo = Math.max(...celulas.map((celula) => celula.v), 0);
  if (maximo <= 0) return null;
  const data = {
    datasets: [
      {
        label: "Atendimentos",
        data: celulas,
        backgroundColor(contexto: ScriptableContext<"matrix">) {
          const bruto = contexto.raw as { v?: number };
          return corCalor(bruto.v ?? 0, maximo);
        },
        borderRadius: 4,
        width(contexto: ScriptableContext<"matrix">) {
          const area = contexto.chart.chartArea;
          if (!area) return 12;
          return Math.max(8, area.width / horas.length - 4);
        },
        height(contexto: ScriptableContext<"matrix">) {
          const area = contexto.chart.chartArea;
          if (!area) return 12;
          return Math.max(8, area.height / dias.length - 4);
        },
      },
    ],
  };
  return (
    <div className="flex flex-col gap-sm">
      <div className="h-64 w-full">
        <Chart
          key={chave}
          type="matrix"
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            animation: animacao,
            plugins: {
              legend: { display: false },
              tooltip: {
                bodyFont: fonte,
                titleFont: fonte,
                callbacks: {
                  title: () => "",
                  label(contexto) {
                    const bruto = contexto.raw as { x: number; y: number; v: number };
                    return `${dias[bruto.y] ?? ""} ${bruto.x}h: ${bruto.v}`;
                  },
                },
              },
            },
            scales: {
              x: {
                type: "linear",
                offset: true,
                min: Math.min(...horas) - 0.5,
                max: Math.max(...horas) + 0.5,
                ticks: {
                  stepSize: 1,
                  color: texto,
                  font: { ...fonte, size: 11 },
                  callback: (valor) => `${valor}h`,
                },
                grid: { display: false },
                border: { display: false },
              },
              y: {
                type: "linear",
                offset: true,
                reverse: true,
                min: -0.5,
                max: dias.length - 0.5,
                ticks: {
                  stepSize: 1,
                  color: texto,
                  font: { ...fonte, size: 12 },
                  callback: (valor) => dias[Number(valor)] ?? "",
                },
                grid: { display: false },
                border: { display: false },
              },
            },
          }}
        />
      </div>
      <p className="flex items-center gap-sm text-body-sm text-on-surface-variant">
        <span>Menor</span>
        <span className="h-2 w-24 rounded-full" style={{ background: "linear-gradient(90deg, #edf1f5, #203347)" }} />
        <span>Maior</span>
      </p>
    </div>
  );
}
