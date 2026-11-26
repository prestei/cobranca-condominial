"use client";

import { useRouter } from "next/navigation";
import { Building2, Clock, Handshake, Scale, TriangleAlert, Wallet } from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
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
import { formatarData, formatarMoeda, nomeCondominio, nomeUnidade, type Cadastros } from "@/data/catalogo";

type Props = {
  dados: DashboardAdvogado;
  cadastros: Cadastros;
  nomeUsuario: string;
  chaveGrafico: string;
};

function saudacaoHorario() {
  const hora = new Date().getHours();
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}

function primeiroNome(nome: string) {
  const parte = nome.trim().split(/\s+/)[0];
  return parte || "Advogado";
}

export function DashboardAdvogadoView({ dados, cadastros, nomeUsuario }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;
  const neg = dados.negociacoes;
  const alertaPendencias =
    (neg?.emAnalise ?? 0) > 0 ||
    (neg?.parcelasVencidas ?? 0) > 0 ||
    (neg?.acordosComDescumprimento ?? 0) > 0 ||
    (dados.juridico?.abertos ?? 0) > 0;

  return (
    <div className="flex flex-col gap-xl">
      <header className="flex flex-wrap items-center justify-between gap-md">
        <div className="min-w-0">
          <h1 className="text-headline-lg font-bold leading-none text-[#12213A]">
            {saudacaoHorario()}, {primeiroNome(nomeUsuario)}!
          </h1>
          <p className="mt-xs max-w-2xl text-body-sm leading-snug text-on-surface-variant">
            Encaminhamentos, propostas aguardando sua decisão e inadimplência dos seus condomínios.
          </p>
        </div>
        <div className="flex flex-wrap gap-sm">
          <Button size="sm" variant="secondary" onClick={() => router.push("/juridico")}>
            Jurídico
          </Button>
          <Button size="sm" variant="primary" onClick={() => router.push("/negociacoes?status=Em+an%C3%A1lise")}>
            Propostas em análise
          </Button>
        </div>
      </header>

      {alertaPendencias ? (
        <div className="flex flex-wrap items-center justify-between gap-md rounded-2xl border border-status-pending/30 bg-status-pending/10 px-md py-md">
          <p className="text-body-md text-on-surface">
            {neg?.emAnalise ? `${neg.emAnalise} proposta${neg.emAnalise === 1 ? "" : "s"} aguardando decisão` : null}
            {neg?.emAnalise && dados.juridico?.abertos ? " · " : null}
            {dados.juridico?.abertos
              ? `${dados.juridico.abertos} encaminhamento${dados.juridico.abertos === 1 ? "" : "s"} em andamento`
              : null}
            {(neg?.parcelasVencidas ?? 0) > 0
              ? `${neg?.emAnalise || dados.juridico?.abertos ? " · " : ""}${neg?.parcelasVencidas} parcela${neg?.parcelasVencidas === 1 ? "" : "s"} vencida${neg?.parcelasVencidas === 1 ? "" : "s"} em acordos`
              : null}
          </p>
          <Button size="sm" variant="secondary" onClick={() => router.push("/negociacoes")}>
            Ver pendências
          </Button>
        </div>
      ) : null}

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
              accent="tertiary"
              iconClassName="bg-tertiary-fixed/40 text-tertiary-container"
              icon={<Icon icon={Handshake} size="md" className="text-tertiary-container" />}
              rotulo="Propostas em análise"
              valor={neg?.emAnalise ?? "—"}
              detalhe={neg ? `${neg.aceitas} acordo${neg.aceitas === 1 ? "" : "s"} ativos` : undefined}
              onClick={neg ? () => router.push("/negociacoes?status=Em+an%C3%A1lise") : undefined}
            />
            <CardMetric
              accent="critical"
              iconClassName="bg-error-container text-status-critical"
              icon={<Icon icon={Scale} size="md" className="text-status-critical" />}
              rotulo="Jurídico em andamento"
              valor={dados.juridico?.abertos ?? 0}
              detalhe={dados.juridico ? `${dados.juridico.total} registrados` : undefined}
              onClick={() => router.push("/juridico")}
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
          </CardMetricRow>
        </section>

        {neg && neg.pendentesAnalise.length > 0 ? (
          <SecaoBloco
            titulo="Propostas aguardando sua decisão"
            linkLabel="Todas as negociações"
            onLink={() => router.push("/negociacoes?status=Em+an%C3%A1lise")}
          >
            <div className="overflow-hidden rounded-lg border border-border-subtle/40">
              <Table aria-label="Propostas em análise">
                <TableHeader>
                  <TableRow className="border-border-subtle/50 hover:bg-transparent">
                    <TableHead>Unidade</TableHead>
                    <TableHead>Condomínio</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Registrada em</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {neg.pendentesAnalise.map((item) => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/negociacoes?proposta=${encodeURIComponent(item.id)}`)}
                    >
                      <TableCell className="font-medium">{nomeUnidade(item.unidadeId, cadastros)}</TableCell>
                      <TableCell>{nomeCondominio(item.condominioId, cadastros)}</TableCell>
                      <TableCell className="tabular-nums">{formatarMoeda(item.valorProposto)}</TableCell>
                      <TableCell className="text-on-surface-variant">{formatarData(item.criadoEm)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </SecaoBloco>
        ) : null}

        {neg && (neg.parcelasVencidas > 0 || neg.acordosComDescumprimento > 0) ? (
          <SecaoBloco titulo="Acordos" linkLabel="Acompanhar" onLink={() => router.push("/negociacoes")}>
            <div className="flex flex-wrap gap-md">
              {neg.parcelasVencidas > 0 ? (
                <div className="flex items-center gap-sm rounded-lg bg-error-container/15 px-md py-sm">
                  <Icon icon={Clock} size="sm" className="text-status-critical" />
                  <span className="text-body-sm text-on-surface">
                    <span className="font-semibold tabular-nums">{neg.parcelasVencidas}</span> parcela
                    {neg.parcelasVencidas === 1 ? "" : "s"} vencida{neg.parcelasVencidas === 1 ? "" : "s"}
                  </span>
                </div>
              ) : null}
              {neg.acordosComDescumprimento > 0 ? (
                <div className="flex items-center gap-sm rounded-lg bg-status-pending/15 px-md py-sm">
                  <Icon icon={TriangleAlert} size="sm" className="text-status-pending" />
                  <span className="text-body-sm text-on-surface">
                    <span className="font-semibold tabular-nums">{neg.acordosComDescumprimento}</span> acordo
                    {neg.acordosComDescumprimento === 1 ? "" : "s"} com possível descumprimento
                  </span>
                </div>
              ) : null}
            </div>
          </SecaoBloco>
        ) : null}

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
      </DashboardLayout>
    </div>
  );
}
