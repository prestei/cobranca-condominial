"use client";

import { useRouter } from "next/navigation";
import { Building2, Scale, Wallet } from "lucide-react";
import { Badge } from "@/components/badge";
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
import type { DashboardAdvogado } from "@/lib/dashboard/service";
import {
  SecaoBloco,
  ListaValorCompacta,
  DashboardMetric,
  GradeMetricasTres,
  dinheiro,
  percentual,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAdvogado;
  chaveGrafico: string;
  filtrosQuery?: string;
};

export function DashboardAdvogadoView({ dados }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;

  return (
    <>
      <SecaoBloco titulo="Condomínios" linkLabel="Cadastro" onLink={() => router.push("/condominios")}>
        <div className="overflow-hidden rounded-lg border border-border-subtle/40">
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
                dados.condominios.itens.slice(0, 8).map((item) => (
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
        {dados.condominios.total > 8 ? (
          <p className="text-body-sm text-on-surface-variant">+ {dados.condominios.total - 8} no cadastro</p>
        ) : null}
      </SecaoBloco>

      {ind ? (
        <SecaoBloco
          titulo="Inadimplência"
          linkLabel="Relatório"
          onLink={() => router.push("/relatorios?relatorio=carteira")}
        >
          <GradeMetricasTres>
            <DashboardMetric
              tom="brass"
              icon={<Icon icon={Wallet} size="md" className="text-brass" />}
              rotulo="Em aberto"
              valor={dinheiro(ind.totalAtualizado)}
            />
            <DashboardMetric
              tom="settled"
              icon={<Icon icon={Scale} size="md" />}
              rotulo={`Acima de ${dados.limiteDias} dias`}
              valor={dinheiro(ind.acimaLimite)}
            />
            <DashboardMetric
              tom="primary"
              icon={<Icon icon={Building2} size="md" />}
              rotulo="Unidades devendo"
              valor={percentual(ind.percentualUnidades)}
              detalhe={`${ind.unidadesDevedoras} un.`}
            />
          </GradeMetricasTres>
          <ListaValorCompacta
            integrada
            itens={dados.rankingCondominio.map((linha) => ({
              chave: String(linha.condominioId),
              nome: linha.nome,
              valor: dinheiro(linha.valor),
              secundario: `${linha.unidadesDevedoras} unidade${linha.unidadesDevedoras === 1 ? "" : "s"}`,
            }))}
            vazio="Sem débitos no escopo."
          />
        </SecaoBloco>
      ) : (
        <EmptyState title="Débitos indisponíveis" description="Sem permissão ou sem dados no escopo." />
      )}

      {dados.juridico ? (
        <SecaoBloco titulo="Jurídico" linkLabel="Encaminhamentos" onLink={() => router.push("/juridico")}>
          <GradeMetricasTres>
            <DashboardMetric
              tom="primary"
              icon={<Icon icon={Scale} size="md" />}
              rotulo="Registrados"
              valor={dados.juridico.total}
            />
            <DashboardMetric
              tom="brass"
              icon={<Icon icon={Scale} size="md" className="text-brass" />}
              rotulo="Em andamento"
              valor={dados.juridico.abertos}
            />
          </GradeMetricasTres>
          {dados.juridico.porStatus.length > 0 ? (
            <ul className="divide-y divide-border-subtle/60 border-t border-border-subtle/60 pt-md">
              {dados.juridico.porStatus.slice(0, 5).map((linha) => (
                <li key={linha.status} className="flex justify-between py-sm text-body-sm first:pt-0">
                  <span className="text-on-surface-variant">{linha.status}</span>
                  <span className="font-semibold tabular-nums text-on-surface">{linha.quantidade}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </SecaoBloco>
      ) : null}

      {dados.retornos && dados.retornos.itens.length > 0 ? (
        <SecaoBloco titulo="Retornos">
          <DashboardRetornosTable integrada itens={dados.retornos.itens.slice(0, 6)} />
        </SecaoBloco>
      ) : null}
    </>
  );
}
