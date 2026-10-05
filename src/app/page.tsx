"use client";

import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ClipboardList, Receipt } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/table";
import { WorkspaceShell } from "@/components/workspace-shell";
import {
  acimaDoLimite,
  debitoEmAberto,
  diasDeAtraso,
  formatarData,
  formatarMoeda,
  getCadastros,
  nomeUnidade,
  nomeUsuario,
  retornoPendente,
  situacaoRetorno,
  subscribeCadastros,
} from "@/data/catalogo";

const rotuloRetorno = {
  atrasado: "Atrasado",
  hoje: "Hoje",
  semana: "Próximos 7 dias",
  agendado: "Agendado",
} as const;

const badgeRetorno = {
  atrasado: "error",
  hoje: "secondary",
  semana: "primary",
  agendado: "secondary",
} as const;

export default function HomePage() {
  const router = useRouter();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const abertos = cadastros.debitos.filter(debitoEmAberto);
  const somar = (itens: typeof abertos) => itens.reduce((total, item) => total + (Number(item.valorAtualizado) || 0), 0);
  const emAberto = somar(abertos);
  const ateSessenta = somar(abertos.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento))));
  const acimaSessenta = somar(abertos.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento))));
  const retornos = cadastros.atendimentos
    .filter(retornoPendente)
    .sort((a, b) => a.dataProximaAcao.localeCompare(b.dataProximaAcao));

  return (
    <WorkspaceShell>
      <PageHeader
        title="Início"
        description="Retornos da equipe e inadimplência da carteira no mesmo lugar."
        actions={
          <Button size="md" onClick={() => router.push("/atendimentos?novo=1")}>
            <Icon icon={ClipboardList} size="sm" />
            Novo
          </Button>
        }
      />
      <PageContent>
        <div className="grid grid-cols-1 gap-md min-[768px]:grid-cols-3">
          <CardMetric iconClassName="bg-gold-subtle text-brass" icon={<Icon icon={Receipt} size="md" className="text-brass" />}>
            <p className="text-metric text-on-surface tabular-nums">
              {emAberto.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="mt-sm text-body-sm text-on-surface-variant">em aberto</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">
              {ateSessenta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="mt-sm text-body-sm text-on-surface-variant">até 60 dias</p>
          </CardMetric>
          <CardMetric iconClassName="bg-surface-subtle text-on-surface-variant" icon={<Icon icon={Receipt} size="md" />}>
            <p className="text-metric text-on-surface tabular-nums">
              {acimaSessenta.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </p>
            <p className="mt-sm text-body-sm text-on-surface-variant">acima de 60 dias</p>
          </CardMetric>
        </div>
        <section className="flex flex-col gap-md">
          <div className="flex flex-wrap items-end justify-between gap-md">
            <h2 className="text-headline-sm text-on-surface">Retornos da equipe</h2>
            <Button size="sm" variant="outline" onClick={() => router.push("/debitos")}>
              Ver inadimplência
            </Button>
          </div>
          <Table aria-label="Retornos agendados">
            <TableHeader>
              <TableRow className="border-border-subtle/50 hover:bg-transparent">
                <TableHead>Quando</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Atendente</TableHead>
                <TableHead>Próxima ação</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {retornos.length === 0 ? (
                <TableEmpty colSpan={5}>Nenhum retorno atrasado, de hoje ou dos próximos 7 dias.</TableEmpty>
              ) : (
                retornos.map((item) => {
                  const situacao = situacaoRetorno(item.dataProximaAcao);
                  const rotulo = situacao ? rotuloRetorno[situacao] : "—";
                  return (
                    <TableRow key={item.id}>
                      <TableCell>{formatarData(item.dataProximaAcao)}</TableCell>
                      <TableCell className="font-medium">{nomeUnidade(item.unidadeId)}</TableCell>
                      <TableCell>{nomeUsuario(item.usuarioId)}</TableCell>
                      <TableCell>{item.proximaAcao || item.assunto || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={situacao ? badgeRetorno[situacao] : "secondary"}>{rotulo}</Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </section>
      </PageContent>
    </WorkspaceShell>
  );
}
