"use client";

import { useRouter } from "next/navigation";
import { BarChart3, Building2, Scale, Wallet } from "lucide-react";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
import { GraficoBarras, GraficoRosca } from "@/components/charts";
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
import { formatarData } from "@/data/catalogo";
import type { DashboardAdvogado } from "@/lib/dashboard/service";
import {
  SecaoBloco,
  Grade,
  SubPainel,
  Leitura,
  dinheiro,
  percentual,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAdvogado;
  chaveGrafico: string;
};

export function DashboardAdvogadoView({ dados, chaveGrafico }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;
  const vazioGrafico = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados" description="Não há valores para exibir no momento." />
  );

  const grupoLider = ind
    ? [...dados.rankingCondominio].sort((a, b) => b.valor - a.valor)[0]
    : undefined;

  return (
    <>
      <Leitura>
        Você acompanha {dados.condominios.total} condomínio{dados.condominios.total === 1 ? "" : "s"}.
        {ind ? ` Em aberto: ${dinheiro(ind.totalAtualizado)} (base ${formatarData(dados.dataBase)}).` : ""}
        {dados.juridico ? ` ${dados.juridico.abertos} encaminhamento${dados.juridico.abertos === 1 ? "" : "s"} jurídico${dados.juridico.abertos === 1 ? "" : "s"} em andamento.` : ""}
      </Leitura>

      <SecaoBloco
        selo="Carteira"
        titulo="Condomínios sob sua responsabilidade"
        linkLabel="Ver condomínios"
        onLink={() => router.push("/condominios")}
      >
        <div className="overflow-hidden rounded-lg border border-border-subtle">
          <Table aria-label="Condomínios no escopo">
            <TableHeader>
              <TableRow className="border-border-subtle/50 hover:bg-transparent">
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dados.condominios.itens.length === 0 ? (
                <TableEmpty colSpan={2}>Nenhum condomínio vinculado ao seu cadastro.</TableEmpty>
              ) : (
                dados.condominios.itens.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.nome}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Ativo" ? "primary" : "secondary"}>{item.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </SecaoBloco>

      {ind ? (
        <SecaoBloco
          selo="Inadimplência"
          titulo="Indicadores"
          descricao={`Valores persistidos na data-base ${formatarData(dados.dataBase)}.`}
          linkLabel="Relatórios"
          onLink={() => router.push("/relatorios?relatorio=carteira")}
        >
          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Wallet} size="md" className="text-brass" />}
              rotulo="Total em aberto"
              valor={dinheiro(ind.totalAtualizado)}
              detalhe="No escopo dos seus condomínios."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Scale} size="md" />}
              rotulo={`Acima de ${dados.limiteDias} dias`}
              valor={dinheiro(ind.acimaLimite)}
              detalhe="Faixa jurídica operacional."
            />
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Building2} size="md" className="text-brass" />}
              rotulo="Unidades devendo"
              valor={percentual(ind.percentualUnidades)}
              detalhe={`${ind.unidadesDevedoras} unidades com débito em aberto.`}
            />
          </div>

          <Grade>
            <SubPainel titulo="Atraso recente x antigo">
              <GraficoRosca
                chave={chaveGrafico}
                vazio={vazioGrafico}
                centro={
                  ind.totalAtualizado > 0
                    ? percentual((ind.acimaLimite / ind.totalAtualizado) * 100)
                    : "—"
                }
                legenda={`+${dados.limiteDias} dias`}
                fatias={[
                  {
                    nome: `Até ${dados.limiteDias} dias`,
                    valor: ind.ateLimite,
                    detalhe: dinheiro(ind.ateLimite),
                    tom: "brass",
                  },
                  {
                    nome: `Acima de ${dados.limiteDias} dias`,
                    valor: ind.acimaLimite,
                    detalhe: dinheiro(ind.acimaLimite),
                    tom: "navy",
                  },
                ]}
              />
            </SubPainel>
            <SubPainel titulo="Condomínios com mais débito">
              <GraficoBarras
                chave={`${chaveGrafico}-rank`}
                vazio={vazioGrafico}
                itens={dados.rankingCondominio.map((linha) => ({
                  nome: linha.nome,
                  valor: linha.valor,
                  detalhe: `${dinheiro(linha.valor)} · ${linha.unidadesDevedoras} unidade${linha.unidadesDevedoras === 1 ? "" : "s"}`,
                }))}
              />
            </SubPainel>
          </Grade>
          {grupoLider && grupoLider.valor > 0 ? (
            <p className="text-body-sm text-on-surface-variant">
              Maior concentração: {grupoLider.nome} ({dinheiro(grupoLider.valor)}).
            </p>
          ) : null}
        </SecaoBloco>
      ) : (
        <EmptyState title="Indicadores indisponíveis" description="Sem permissão para consultar débitos ou não há dados." />
      )}

      {dados.juridico ? (
        <SecaoBloco
          selo="Jurídico"
          titulo="Encaminhamentos"
          linkLabel="Abrir jurídico"
          onLink={() => router.push("/juridico")}
        >
          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2">
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Scale} size="md" />}
              rotulo="Total registrado"
              valor={dados.juridico.total}
            />
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Scale} size="md" className="text-brass" />}
              rotulo="Em andamento"
              valor={dados.juridico.abertos}
            />
          </div>
          {dados.juridico.porStatus.length > 0 ? (
            <SubPainel titulo="Por status">
              <ul className="flex flex-col gap-sm">
                {dados.juridico.porStatus.map((linha) => (
                  <li key={linha.status} className="flex justify-between text-body-sm">
                    <span>{linha.status}</span>
                    <span className="font-medium tabular-nums">{linha.quantidade}</span>
                  </li>
                ))}
              </ul>
            </SubPainel>
          ) : null}
        </SecaoBloco>
      ) : null}

      {dados.retornos ? (
        <SecaoBloco selo="Agenda" titulo="Retornos no escopo" descricao="Visão operacional dos condomínios vinculados.">
          <DashboardRetornosTable itens={dados.retornos.itens} />
        </SecaoBloco>
      ) : null}
    </>
  );
}
