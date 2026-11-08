"use client";

import { useRouter } from "next/navigation";
import { Building2, Scale, Wallet } from "lucide-react";
import { Badge } from "@/components/badge";
import { CardMetric } from "@/components/card-metric";
import { CardMetricRow } from "@/components/card-metric-row";
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
  DashboardLayout,
  ListaValorCompacta,
  SecaoBloco,
  dinheiro,
  percentual,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAdvogado;
  chaveGrafico: string;
};

export function DashboardAdvogadoView({ dados }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;

  return (
    <DashboardLayout>
      <section aria-label="Indicadores do escopo">
        <CardMetricRow aria-label="KPIs jurídicos" desktopCols={4}>
          <CardMetric
            accent="primary"
            iconClassName="bg-primary-fixed/50 text-primary-container"
            icon={<Icon icon={Building2} size="md" className="text-primary-container" />}
            rotulo="Condomínios"
            valor={dados.condominios.total}
            detalhe="Sob sua responsabilidade"
            onClick={() => router.push("/condominios")}
          />
          <CardMetric
            accent="brass"
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={Wallet} size="md" className="text-brass" />}
            rotulo="Em aberto"
            valor={ind ? dinheiro(ind.totalAtualizado) : "—"}
            detalhe={ind ? `${ind.unidadesDevedoras} unidades` : "Sem permissão"}
            onClick={ind ? () => router.push("/debitos") : undefined}
          />
          <CardMetric
            accent="critical"
            iconClassName="bg-error-container text-status-critical"
            icon={<Icon icon={Scale} size="md" className="text-status-critical" />}
            rotulo={`Acima de ${dados.limiteDias} dias`}
            valor={ind ? dinheiro(ind.acimaLimite) : "—"}
            onClick={ind ? () => router.push("/debitos") : undefined}
          />
          <CardMetric
            accent="tertiary"
            iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
            icon={<Icon icon={Scale} size="md" className="text-tertiary-container" />}
            rotulo="Jurídico em andamento"
            valor={dados.juridico?.abertos ?? 0}
            detalhe={dados.juridico ? `${dados.juridico.total} registrados` : undefined}
            onClick={() => router.push("/juridico")}
          />
        </CardMetricRow>
      </section>

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
          titulo="Maiores saldos"
          linkLabel="Relatório"
          onLink={() => router.push("/relatorios?relatorio=carteira")}
        >
          <p className="mb-md text-body-sm text-on-surface-variant">
            {percentual(ind.percentualUnidades)} das unidades no escopo estão inadimplentes.
          </p>
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

      {dados.juridico && dados.juridico.porStatus.length > 0 ? (
        <SecaoBloco titulo="Status jurídico" linkLabel="Encaminhamentos" onLink={() => router.push("/juridico")}>
          <ul className="divide-y divide-border-subtle/60">
            {dados.juridico.porStatus.slice(0, 6).map((linha) => (
              <li key={linha.status} className="flex justify-between py-sm text-body-sm">
                <span className="text-on-surface-variant">{linha.status}</span>
                <span className="font-semibold tabular-nums text-on-surface">{linha.quantidade}</span>
              </li>
            ))}
          </ul>
        </SecaoBloco>
      ) : null}

      {dados.retornos && dados.retornos.itens.length > 0 ? (
        <SecaoBloco titulo="Retornos">
          <DashboardRetornosTable integrada itens={dados.retornos.itens.slice(0, 6)} />
        </SecaoBloco>
      ) : null}
    </DashboardLayout>
  );
}
