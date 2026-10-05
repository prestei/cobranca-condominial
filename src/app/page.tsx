"use client";

import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  Building2,
  CalendarClock,
  Clock,
  MessageCircle,
  Phone,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/badge";
import { Button } from "@/components/button";
import { CardMetric } from "@/components/card-metric";
import {
  GraficoBarras,
  GraficoColunas,
  GraficoEmpilhado,
  GraficoRosca,
  tomPorIndice,
} from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import { PageContent, PageHeader } from "@/components/page-header";
import { resolverPeriodo } from "@/components/period-input";
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
  advogados,
  debitoAbertoNaData,
  diasDeAtraso,
  faixasAtraso,
  formatarData,
  getCadastros,
  grupoDebito,
  gruposDebito,
  hojeIso,
  LIMITE_AMIGAVEL_DIAS,
  nomeUnidade,
  nomeUsuario,
  retornoPendente,
  situacaoRetorno,
  subscribeCadastros,
  tituloInicio,
  usuarioSessaoApp,
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

function Grade({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-md min-[961px]:grid-cols-2">{children}</div>;
}

function SubPainel({ titulo, nota, children }: { titulo: string; nota?: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-md rounded-lg border border-border-subtle/60 bg-surface-card p-md min-[768px]:p-lg">
      <div className="flex flex-col gap-xs">
        <h3 className="text-body-sm font-semibold text-on-surface">{titulo}</h3>
        {nota ? <p className="text-body-sm text-on-surface-variant">{nota}</p> : null}
      </div>
      {children}
    </div>
  );
}

function SecaoBloco({
  selo,
  titulo,
  descricao,
  href,
  linkLabel,
  onLink,
  children,
}: {
  selo: string;
  titulo: string;
  descricao?: string;
  href?: string;
  linkLabel?: string;
  onLink?: () => void;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-lg rounded-xl border border-border-subtle bg-surface-card p-lg shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-md border-b border-border-subtle pb-md">
        <div className="flex min-w-0 flex-col gap-xs">
          <p className="text-label-md uppercase text-brass">{selo}</p>
          <h2 className="text-headline-sm text-on-surface">{titulo}</h2>
          {descricao ? <p className="text-body-sm text-on-surface-variant">{descricao}</p> : null}
        </div>
        {href && linkLabel && onLink ? (
          <Button size="sm" variant="ghost" className="shrink-0 text-on-surface-variant" onClick={onLink}>
            {linkLabel}
            <Icon icon={ArrowUpRight} size="sm" />
          </Button>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function Leitura({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-gold-subtle/80 px-md py-sm shadow-card">
      <p className="text-body-sm leading-relaxed text-on-surface">{children}</p>
    </div>
  );
}

function dinheiro(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function percentual(valor: number) {
  return `${valor.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
}

function somarDebitos(itens: Array<{ valorAtualizado: string }>) {
  return itens.reduce((total, item) => total + (Number(item.valorAtualizado) || 0), 0);
}

function dentroDataHora(dataHora: string, inicio: string, fim: string) {
  const dia = dataHora.slice(0, 10);
  if (!dia) return false;
  if (inicio && dia < inicio) return false;
  if (fim && dia > fim) return false;
  return true;
}

function diaCurto(iso: string) {
  const texto = formatarData(iso.slice(0, 10));
  return texto === "—" ? iso : texto.slice(0, 5);
}

export default function HomePage() {
  const router = useRouter();
  const cadastros = useSyncExternalStore(subscribeCadastros, getCadastros, getCadastros);
  const usuario = usuarioSessaoApp(cadastros);
  const hoje = hojeIso();
  const dataBase = hoje;
  const chave = `home|${dataBase}`;

  const carteira = useMemo(() => {
    const debitos = cadastros.debitos.filter((item) => debitoAbertoNaData(item, dataBase));
    const totalAberto = somarDebitos(debitos);
    const totalOriginal = debitos.reduce((total, item) => total + (Number(item.valorOriginal) || 0), 0);
    const ate60 = debitos.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
    const acima60 = debitos.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)));
    const valorAte60 = somarDebitos(ate60);
    const valorAcima60 = somarDebitos(acima60);
    const unidadesDevedoras = new Set(debitos.map((item) => item.unidadeId)).size;
    const unidadesCarteira = cadastros.unidades.length;
    const percentualUnidades = unidadesCarteira ? (unidadesDevedoras / unidadesCarteira) * 100 : 0;
    const parteJuridica = totalAberto ? (valorAcima60 / totalAberto) * 100 : 0;

    const rankingCondominio = [...new Set(debitos.map((item) => item.condominioId))]
      .map((id) => {
        const itens = debitos.filter((item) => item.condominioId === id);
        const unidadesCondo = cadastros.unidades.filter((item) => item.condominioId === id).length;
        const devedoras = new Set(itens.map((item) => item.unidadeId)).size;
        return {
          nome: cadastros.condominios.find((item) => item.id === id)?.nome ?? "—",
          valor: somarDebitos(itens),
          devedoras,
          unidades: unidadesCondo,
        };
      })
      .sort((a, b) => b.valor - a.valor);

    const porAdvogado = advogados
      .map((advogado) => {
        const itens = debitos.filter(
          (item) => cadastros.condominios.find((condominio) => condominio.id === item.condominioId)?.advogado === advogado,
        );
        return {
          nome: advogado,
          valor: somarDebitos(itens),
          ate: somarDebitos(itens.filter((item) => !acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
          acima: somarDebitos(itens.filter((item) => acimaDoLimite(diasDeAtraso(item.dataVencimento, dataBase)))),
        };
      })
      .filter((linha) => linha.valor > 0)
      .sort((a, b) => b.valor - a.valor);

    const porGrupo = gruposDebito.map((grupo) => {
      const itens = debitos.filter((item) => grupoDebito(item.descricao) === grupo);
      const valor = somarDebitos(itens);
      return {
        nome: grupo,
        valor,
        percentual: totalAberto ? (valor / totalAberto) * 100 : 0,
      };
    });
    const grupoLider = [...porGrupo].sort((a, b) => b.valor - a.valor)[0];

    const porFaixa = faixasAtraso.map((faixa) => {
      const itens = debitos.filter((item) => {
        const dias = diasDeAtraso(item.dataVencimento, dataBase);
        return dias >= faixa.min && dias <= faixa.max;
      });
      const valor = somarDebitos(itens);
      return { nome: faixa.label, valor, percentual: totalAberto ? (valor / totalAberto) * 100 : 0 };
    });
    const faixaLider = [...porFaixa].sort((a, b) => b.valor - a.valor)[0];

    return {
      debitos,
      totalAberto,
      totalOriginal,
      valorAte60,
      valorAcima60,
      unidadesDevedoras,
      unidadesCarteira,
      percentualUnidades,
      parteJuridica,
      rankingCondominio,
      porAdvogado,
      porGrupo,
      grupoLider,
      porFaixa,
      faixaLider,
    };
  }, [cadastros, dataBase]);

  const operacao = useMemo(() => {
    const periodo = resolverPeriodo({ preset: "7", de: "", ate: "" }, hoje);
    const atendimentos = cadastros.atendimentos.filter((item) => dentroDataHora(item.dataHora, periodo.inicio, periodo.fim));
    const responderam = atendimentos.filter((item) => item.respondeu === "Sim").length;
    const taxaResposta = atendimentos.length ? (responderam / atendimentos.length) * 100 : 0;
    const unidadesContatadas = new Set(atendimentos.map((item) => item.unidadeId)).size;
    const retornosPendentes = cadastros.atendimentos.filter(retornoPendente).length;

    const serieMapa = new Map<string, number>();
    for (const item of atendimentos) {
      const dia = item.dataHora.slice(0, 10);
      serieMapa.set(dia, (serieMapa.get(dia) ?? 0) + 1);
    }
    const serie = [...serieMapa.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dia, quantidade]) => ({ nome: diaCurto(dia), valor: quantidade, rotulo: String(quantidade) }));

    const naoResponderam = atendimentos.length - responderam;

    return {
      periodo,
      atendimentos: atendimentos.length,
      taxaResposta,
      unidadesContatadas,
      retornosPendentes,
      serie,
      responderam,
      naoResponderam,
    };
  }, [cadastros, hoje]);

  const retornos = cadastros.atendimentos
    .filter(retornoPendente)
    .sort((a, b) => a.dataProximaAcao.localeCompare(b.dataProximaAcao));

  const vazioGrafico = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados" description="Não há valores para exibir no momento." />
  );

  return (
    <WorkspaceShell>
      <PageHeader title={tituloInicio(usuario.name)} description="Quanto está em aberto, o que a equipe fez e os retornos do dia." />
      <PageContent className="flex flex-col gap-xl">
        {carteira.totalAberto > 0 ? (
          <Leitura>
            Em aberto: {dinheiro(carteira.totalAberto)} (valores de {formatarData(dataBase)}). {percentual(carteira.percentualUnidades)} das
            unidades estão devendo.
            {carteira.grupoLider && carteira.grupoLider.valor > 0
              ? ` A maior parte vem de ${carteira.grupoLider.nome} (${percentual(carteira.grupoLider.percentual)}).`
              : ""}
            {percentual(carteira.parteJuridica)} do valor está com mais de {LIMITE_AMIGAVEL_DIAS} dias sem pagar. Na semana:{" "}
            {operacao.atendimentos} contato{operacao.atendimentos === 1 ? "" : "s"}, {percentual(operacao.taxaResposta)} com retorno do morador.
          </Leitura>
        ) : null}

        <SecaoBloco
          selo="Carteira"
          titulo="Inadimplência"
          descricao={`Situação de ${formatarData(dataBase)}.`}
          href="/relatorios?relatorio=carteira"
          linkLabel="Mais detalhes"
          onLink={() => router.push("/relatorios?relatorio=carteira")}
        >
          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Wallet} size="md" className="text-brass" />}
              rotulo="Total em aberto"
              valor={dinheiro(carteira.totalAberto)}
              detalhe="Com juros e multa, se houver."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Wallet} size="md" />}
              rotulo="Sem juros nem multa"
              valor={dinheiro(carteira.totalOriginal)}
              detalhe="Valor original das cobranças."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Clock} size="md" />}
              rotulo={`Atraso de até ${LIMITE_AMIGAVEL_DIAS} dias`}
              valor={dinheiro(carteira.valorAte60)}
              detalhe="Contas mais recentes."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Scale} size="md" />}
              rotulo={`Mais de ${LIMITE_AMIGAVEL_DIAS} dias sem pagar`}
              valor={dinheiro(carteira.valorAcima60)}
              detalhe="Contas mais antigas."
            />
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Building2} size="md" className="text-brass" />}
              rotulo="Unidades devendo"
              valor={percentual(carteira.percentualUnidades)}
              detalhe={`${carteira.unidadesDevedoras} de ${carteira.unidadesCarteira} unidades.`}
            />
          </div>

          <Grade>
            <SubPainel titulo="Atraso recente x antigo" nota={`Quanto está com até ou com mais de ${LIMITE_AMIGAVEL_DIAS} dias.`}>
            <GraficoRosca
              chave={chave}
              vazio={vazioGrafico}
              centro={percentual(carteira.parteJuridica)}
              legenda="com +60 dias"
              fatias={[
                { nome: `Até ${LIMITE_AMIGAVEL_DIAS} dias`, valor: carteira.valorAte60, detalhe: dinheiro(carteira.valorAte60), tom: "brass" },
                {
                  nome: `Acima de ${LIMITE_AMIGAVEL_DIAS} dias`,
                  valor: carteira.valorAcima60,
                  detalhe: dinheiro(carteira.valorAcima60),
                  tom: "navy",
                },
              ]}
            />
            </SubPainel>
            <SubPainel titulo="Tipo de cobrança" nota="Condomínio, taxa extra, acordo e outros.">
              <GraficoRosca
                chave={`${chave}-grupos`}
                vazio={vazioGrafico}
                centro={carteira.grupoLider && carteira.grupoLider.valor > 0 ? percentual(carteira.grupoLider.percentual) : "—"}
                legenda="maior parte"
                fatias={carteira.porGrupo
                  .filter((linha) => linha.valor > 0)
                  .map((linha, indice) => ({
                    nome: linha.nome,
                    valor: linha.valor,
                    detalhe: `${dinheiro(linha.valor)} · ${percentual(linha.percentual)}`,
                    tom: tomPorIndice(indice),
                  }))}
              />
            </SubPainel>
          </Grade>

          <Grade>
            <SubPainel titulo="Há quanto tempo está devendo">
              <GraficoColunas
                chave={`${chave}-faixas`}
                vazio={vazioGrafico}
                itens={carteira.porFaixa.map((linha) => ({
                  nome: linha.nome,
                  valor: linha.valor,
                  rotulo: percentual(linha.percentual),
                  tom: carteira.faixaLider && linha.nome === carteira.faixaLider.nome ? "brass" : "navy",
                }))}
              />
            </SubPainel>
            <SubPainel titulo="Condomínios com mais débito">
              <GraficoBarras
                chave={`${chave}-ranking`}
                vazio={vazioGrafico}
                itens={carteira.rankingCondominio.slice(0, 8).map((linha) => ({
                  nome: linha.nome,
                  valor: linha.valor,
                  detalhe: `${dinheiro(linha.valor)} · ${linha.devedoras} de ${linha.unidades} unidades devendo`,
                }))}
              />
            </SubPainel>
          </Grade>

          <SubPainel titulo="Por advogado">
            <GraficoEmpilhado
              chave={`${chave}-adv`}
              vazio={vazioGrafico}
              itens={carteira.porAdvogado.map((linha) => ({
                nome: linha.nome,
                ate: linha.ate,
                acima: linha.acima,
                detalhe: dinheiro(linha.valor),
              }))}
            />
          </SubPainel>

        </SecaoBloco>

        <SecaoBloco
          selo="Equipe"
          titulo="Últimos 7 dias"
          descricao={`De ${formatarData(operacao.periodo.inicio)} a ${formatarData(operacao.periodo.fim)}.`}
          href="/relatorios?relatorio=equipe"
          linkLabel="Mais detalhes"
          onLink={() => router.push("/relatorios?relatorio=equipe")}
        >
          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-2">
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Phone} size="md" />}
              rotulo="Contatos feitos"
              valor={operacao.atendimentos}
              detalhe="Ligações, WhatsApp e outros na semana."
            />
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={MessageCircle} size="md" className="text-brass" />}
              rotulo="Morador respondeu"
              valor={percentual(operacao.taxaResposta)}
              detalhe={
                operacao.atendimentos > 0
                  ? `${operacao.responderam} de ${operacao.atendimentos} contatos.`
                  : "Nenhum contato no período."
              }
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Users} size="md" />}
              rotulo="Unidades ligadas"
              valor={operacao.unidadesContatadas}
              detalhe="Cada unidade conta uma vez."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Lembretes em aberto"
              valor={operacao.retornosPendentes}
              detalhe="Atrasados, de hoje ou desta semana."
            />
          </div>

          <Grade>
            <SubPainel titulo="Atendimentos por dia">
              <GraficoColunas chave={`${chave}-serie`} vazio={vazioGrafico} itens={operacao.serie.map((linha) => ({ ...linha, tom: "settled" }))} />
            </SubPainel>
            <SubPainel titulo="Respondeu ou não">
              <GraficoRosca
                chave={`${chave}-resposta`}
                vazio={vazioGrafico}
                centro={percentual(operacao.taxaResposta)}
                legenda="responderam"
                fatias={[
                  { nome: "Sim", valor: operacao.responderam, detalhe: String(operacao.responderam), tom: "settled" },
                  { nome: "Não", valor: operacao.naoResponderam, detalhe: String(operacao.naoResponderam), tom: "mist" },
                ]}
              />
            </SubPainel>
          </Grade>
        </SecaoBloco>

        <SecaoBloco
          selo="Agenda"
          titulo="Retornos da equipe"
          descricao="O que precisa fazer ligação de novo."
          href="/atendimentos"
          linkLabel="Abrir lista"
          onLink={() => router.push("/atendimentos")}
        >
          <div className="overflow-hidden rounded-lg border border-border-subtle">
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
          </div>
        </SecaoBloco>
      </PageContent>
    </WorkspaceShell>
  );
}
