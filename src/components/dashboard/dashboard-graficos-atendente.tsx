"use client";

import { useRouter } from "next/navigation";
import { BarChart3 } from "lucide-react";
import {
  GraficoBarras,
  GraficoColunas,
  GraficoColunasAgrupadas,
  GraficoRosca,
  tomPorIndice,
} from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import {
  SecaoBloco,
  Grade,
  SubPainel,
  dinheiro,
  percentual,
} from "@/components/dashboard/dashboard-shared";
import type { DashboardGraficosAtendente } from "@/lib/dashboard/graficos-atendente";
import type { FaixaAtrasoDashboardId, SituacaoCarteiraId } from "@/lib/dashboard/graficos-atendente";
import {
  queryNavegacaoAtendimentos,
  queryNavegacaoDebitos,
  type DashboardFiltrosNorm,
} from "@/lib/dashboard/filtros";

type Props = {
  dados: DashboardGraficosAtendente;
  dataBase: string;
  chaveGrafico: string;
  filtrosAplicados?: DashboardFiltrosNorm;
};

const LINK_SITUACAO: Record<SituacaoCarteiraId, string> = {
  aguardando_atendimento: "/atendimentos?operacional=pendentes",
  em_negociacao: "/atendimentos?aba=fila",
  aguardando_retorno: "/atendimentos?operacional=aguardando-retorno",
  em_acompanhamento: "/atendimentos?operacional=atencao",
  encaminhado_juridico: "/atendimentos?aba=fila",
  concluido: "/atendimentos?operacional=resolvidos",
};

export function DashboardGraficosAtendente({ dados, dataBase, chaveGrafico, filtrosAplicados }: Props) {
  const router = useRouter();
  const qsDebitos = filtrosAplicados ? queryNavegacaoDebitos(filtrosAplicados) : "";
  const qsAtendimentos = filtrosAplicados ? queryNavegacaoAtendimentos(filtrosAplicados) : "";
  const vazioGrafico = (
    <EmptyState
      icon={<Icon icon={BarChart3} size="lg" />}
      title="Sem dados"
      description="Não há valores para exibir no momento."
    />
  );

  const totalFaixas = dados.faixasAtraso.reduce((acc, item) => acc + item.valor, 0);
  const situacoesComValor = dados.porSituacao.filter((item) => item.quantidade > 0);
  const totalSituacao = situacoesComValor.reduce((acc, item) => acc + item.quantidade, 0);
  const liderSituacao = [...situacoesComValor].sort((a, b) => b.quantidade - a.quantidade)[0];
  const evolucaoComSaldo = dados.evolucaoMensal.filter((item) => item.saldoAberto > 0 || item.recuperacaoFinanceira > 0);

  function abrirFaixa(faixaId: FaixaAtrasoDashboardId) {
    const base = `faixaAtraso=${faixaId}&dataBase=${dataBase}`;
    router.push(qsDebitos ? `/debitos?${qsDebitos}&${base}` : `/debitos?${base}`);
  }

  function abrirCondominio(condominioId: number) {
    const base = `condominio=${condominioId}&dataBase=${dataBase}`;
    router.push(qsDebitos ? `/debitos?${qsDebitos}&${base}` : `/debitos?${base}`);
  }

  function abrirSituacao(id: SituacaoCarteiraId) {
    const destino = LINK_SITUACAO[id];
    if (!qsAtendimentos) {
      router.push(destino);
      return;
    }
    const sep = destino.includes("?") ? "&" : "?";
    router.push(`${destino}${sep}${qsAtendimentos}`);
  }

  function abrirMesEvolucao(dataBaseMes: string) {
    const base = `dataBase=${dataBaseMes}`;
    router.push(qsDebitos ? `/debitos?${qsDebitos}&${base}` : `/debitos?${base}`);
  }

  return (
    <SecaoBloco
      selo="Análise"
      titulo="Gráficos da carteira"
      descricao={`Inadimplência e distribuição na data-base. ${dados.totais.debitosConsiderados} débito(s) em ${dados.totais.unidadesNaFila} unidade(s) na fila.`}
      linkLabel="Abrir débitos"
      onLink={() => router.push(qsDebitos ? `/debitos?${qsDebitos}` : "/debitos")}
    >
      <div className="flex min-w-0 flex-col gap-lg">
      <Grade>
        <SubPainel
          titulo="Inadimplência por faixa de atraso"
          nota={dados.regras.faixasAtraso}
        >
          <div className="flex flex-col gap-md">
            <GraficoColunas
              chave={`${chaveGrafico}-faixas`}
              vazio={vazioGrafico}
              itens={dados.faixasAtraso.map((linha, indice) => ({
                nome: linha.nome,
                valor: linha.valor,
                rotulo: dinheiro(linha.valor),
                tom: indice === 0 ? "brass" : "navy",
              }))}
            />
            <ul className="flex flex-col gap-xs">
              {dados.faixasAtraso.map((linha) => (
                <li key={linha.id}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-sm rounded-md px-sm py-xs text-left text-body-sm text-on-surface transition-colors hover:bg-surface-subtle"
                    onClick={() => abrirFaixa(linha.id as FaixaAtrasoDashboardId)}
                  >
                    <span>{linha.nome}</span>
                    <span className="tabular-nums text-on-surface-variant">
                      {linha.quantidade} reg. · {dinheiro(linha.valor)} ({percentual(linha.percentual)})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            {totalFaixas > 0 ? (
              <p className="text-body-sm text-on-surface-variant">Soma das faixas: {dinheiro(totalFaixas)}</p>
            ) : null}
          </div>
        </SubPainel>
        <SubPainel titulo="Distribuição por situação" nota={dados.regras.situacaoCarteira}>
          <div className="flex flex-col gap-md">
            <GraficoRosca
              chave={`${chaveGrafico}-situacao`}
              vazio={vazioGrafico}
              centro={liderSituacao ? String(liderSituacao.quantidade) : "—"}
              legenda={liderSituacao?.nome ?? "unidades"}
              fatias={situacoesComValor.map((linha, indice) => ({
                nome: linha.nome,
                valor: linha.quantidade,
                detalhe: `${linha.quantidade} (${percentual(linha.percentual)})`,
                tom: tomPorIndice(indice),
              }))}
            />
            <ul className="flex flex-col gap-xs">
              {dados.porSituacao.map((linha) => (
                <li key={linha.id}>
                  <button
                    type="button"
                    disabled={linha.quantidade === 0}
                    className="flex w-full items-center justify-between gap-sm rounded-md px-sm py-xs text-left text-body-sm text-on-surface transition-colors enabled:hover:bg-surface-subtle disabled:opacity-50"
                    onClick={() => abrirSituacao(linha.id as SituacaoCarteiraId)}
                  >
                    <span>{linha.nome}</span>
                    <span className="tabular-nums text-on-surface-variant">{linha.quantidade} un.</span>
                  </button>
                </li>
              ))}
            </ul>
            {totalSituacao > 0 ? (
              <p className="text-body-sm text-on-surface-variant">Total na fila: {totalSituacao} unidade(s)</p>
            ) : null}
          </div>
        </SubPainel>
      </Grade>

      <SubPainel titulo="Inadimplência por condomínio" nota="Apenas condomínios com unidades na sua carteira vigente.">
        {dados.porCondominio.length === 0 ? (
          vazioGrafico
        ) : (
          <>
            <GraficoBarras
              chave={`${chaveGrafico}-condominios`}
              vazio={vazioGrafico}
              itens={dados.porCondominio.slice(0, 8).map((linha, indice) => ({
                nome: linha.nome,
                valor: linha.valorAtualizado,
                detalhe: `${dinheiro(linha.valorAtualizado)} · ${linha.unidadesInadimplentes} un.`,
                tom: indice === 0 ? "brass" : "navy",
              }))}
            />
            <div className="mt-md min-w-0 overflow-x-auto overflow-y-hidden rounded-lg border border-border-subtle">
              <Table aria-label="Inadimplência por condomínio" className="min-w-[32rem]">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Unidades</TableHead>
                    <TableHead>Original</TableHead>
                    <TableHead>Atualizado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dados.porCondominio.map((linha) => (
                    <TableRow
                      key={linha.condominioId}
                      className="cursor-pointer"
                      onClick={() => abrirCondominio(linha.condominioId)}
                    >
                      <TableCell className="font-medium">{linha.nome}</TableCell>
                      <TableCell>{linha.unidadesInadimplentes}</TableCell>
                      <TableCell className="tabular-nums">{dinheiro(linha.valorOriginal)}</TableCell>
                      <TableCell className="tabular-nums">{dinheiro(linha.valorAtualizado)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </SubPainel>

      <SubPainel titulo="Evolução da carteira (mensal)" nota={dados.regras.evolucao}>
        {evolucaoComSaldo.length === 0 ? (
          vazioGrafico
        ) : (
          <div className="flex flex-col gap-md">
            <GraficoColunasAgrupadas
              chave={`${chaveGrafico}-evolucao`}
              vazio={vazioGrafico}
              series={[
                { nome: "Saldo em aberto", tom: "navy" },
                { nome: "Recuperação financeira", tom: "settled" },
              ]}
              grupos={dados.evolucaoMensal.map((linha) => ({
                nome: linha.mesRotulo,
                valores: [linha.saldoAberto, linha.recuperacaoFinanceira],
              }))}
            />
            <ul className="flex flex-col gap-xs">
              {dados.evolucaoMensal.map((linha) => (
                <li key={linha.mes}>
                  <button
                    type="button"
                    className="flex w-full flex-wrap items-center justify-between gap-sm rounded-md px-sm py-xs text-left text-body-sm hover:bg-surface-subtle"
                    onClick={() => abrirMesEvolucao(linha.dataBaseMes)}
                  >
                    <span className="font-medium text-on-surface">{linha.mesRotulo}</span>
                    <span className="text-on-surface-variant">
                      Saldo {dinheiro(linha.saldoAberto)}
                      {linha.variacaoSaldo != null ? (
                        <>
                          {" "}
                          · var. {linha.variacaoSaldo >= 0 ? "+" : ""}
                          {dinheiro(linha.variacaoSaldo)}
                        </>
                      ) : null}
                      {" · "}
                      Rec. {dinheiro(linha.recuperacaoFinanceira)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </SubPainel>
      </div>
    </SecaoBloco>
  );
}
