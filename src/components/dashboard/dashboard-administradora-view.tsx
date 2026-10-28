"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  MessageCircle,
  Phone,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
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
import { formatarData } from "@/data/catalogo";
import type { DashboardAdministradora } from "@/lib/dashboard/service";
import {
  SecaoBloco,
  Grade,
  SubPainel,
  Leitura,
  dinheiro,
  percentual,
  diaCurto,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAdministradora;
  chaveGrafico: string;
};

export function DashboardAdministradoraView({ dados, chaveGrafico }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;
  const grupoLider = useMemo(
    () => [...dados.porGrupo].sort((a, b) => b.valor - a.valor)[0],
    [dados.porGrupo],
  );
  const faixaLider = useMemo(
    () => [...dados.porFaixa].sort((a, b) => b.valor - a.valor)[0],
    [dados.porFaixa],
  );

  const vazioGrafico = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados" description="Não há valores para exibir no momento." />
  );

  return (
    <>
      {ind.totalAtualizado > 0 ? (
        <Leitura>
          Em aberto: {dinheiro(ind.totalAtualizado)} (valores de {formatarData(dados.dataBase)}).{" "}
          {percentual(ind.percentualUnidades)} das unidades estão devendo.
          {grupoLider && grupoLider.valor > 0
            ? ` A maior parte vem de ${grupoLider.nome} (${percentual(grupoLider.percentual)}).`
            : ""}
          {percentual(dados.parteJuridicaPercentual)} do valor está com mais de {dados.limiteDias} dias sem pagar. Na semana:{" "}
          {dados.operacao.contatos} contato{dados.operacao.contatos === 1 ? "" : "s"},{" "}
          {percentual(dados.operacao.taxaResposta)} com retorno do morador. Fila: {dados.fila.emCobranca} em cobrança
          {dados.fila.semResponsavel > 0 ? `, ${dados.fila.semResponsavel} sem RE` : ""}.
        </Leitura>
      ) : null}

      <SecaoBloco
        selo="Carteira"
        titulo="Inadimplência"
        descricao={`Situação de ${formatarData(dados.dataBase)}.`}
        linkLabel="Mais detalhes"
        onLink={() => router.push("/relatorios?relatorio=carteira")}
      >
        <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">
          <CardMetric
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={Wallet} size="md" className="text-brass" />}
            rotulo="Total em aberto"
            valor={dinheiro(ind.totalAtualizado)}
            detalhe="Valores persistidos (importação ou manual)."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Wallet} size="md" />}
            rotulo="Sem juros nem multa"
            valor={dinheiro(ind.totalOriginal)}
            detalhe="Valor original das cobranças."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Clock} size="md" />}
            rotulo={`Atraso de até ${dados.limiteDias} dias`}
            valor={dinheiro(ind.ateLimite)}
            detalhe="Contas mais recentes."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Scale} size="md" />}
            rotulo={`Mais de ${dados.limiteDias} dias sem pagar`}
            valor={dinheiro(ind.acimaLimite)}
            detalhe="Contas mais antigas."
          />
          <CardMetric
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={Building2} size="md" className="text-brass" />}
            rotulo="Unidades devendo"
            valor={percentual(ind.percentualUnidades)}
            detalhe={`${ind.unidadesDevedoras} unidades com débito em aberto.`}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={ClipboardList} size="md" />}
            rotulo="Cobranças ativas"
            valor={dados.fila.emCobranca}
            detalhe={`${dados.fila.retornosHoje} retorno${dados.fila.retornosHoje === 1 ? "" : "s"} previsto${dados.fila.retornosHoje === 1 ? "" : "s"} para hoje.`}
          />
        </div>

        <Grade>
          <SubPainel titulo="Atraso recente x antigo" nota={`Quanto está com até ou com mais de ${dados.limiteDias} dias.`}>
            <GraficoRosca
              chave={chaveGrafico}
              vazio={vazioGrafico}
              centro={percentual(dados.parteJuridicaPercentual)}
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
          <SubPainel titulo="Tipo de cobrança" nota="Condomínio, taxa extra, acordo e outros.">
            <GraficoRosca
              chave={`${chaveGrafico}-grupos`}
              vazio={vazioGrafico}
              centro={grupoLider && grupoLider.valor > 0 ? percentual(grupoLider.percentual) : "—"}
              legenda="maior parte"
              fatias={dados.porGrupo
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
              chave={`${chaveGrafico}-faixas`}
              vazio={vazioGrafico}
              itens={dados.porFaixa.map((linha) => ({
                nome: linha.nome,
                valor: linha.valor,
                rotulo: percentual(linha.percentual),
                tom: faixaLider && linha.nome === faixaLider.nome ? "brass" : "navy",
              }))}
            />
          </SubPainel>
          <SubPainel titulo="Condomínios com mais débito">
            <GraficoBarras
              chave={`${chaveGrafico}-ranking`}
              vazio={vazioGrafico}
              itens={dados.rankingCondominio.map((linha) => ({
                nome: linha.nome,
                valor: linha.valor,
                detalhe: `${dinheiro(linha.valor)} · ${linha.unidadesDevedoras} de ${linha.unidadesTotal} unidades devendo`,
              }))}
            />
          </SubPainel>
        </Grade>

        <SubPainel titulo="Por advogado responsável">
          <GraficoEmpilhado
            chave={`${chaveGrafico}-adv`}
            vazio={vazioGrafico}
            itens={dados.porAdvogado.map((linha) => ({
              nome: linha.nome,
              ate: linha.ateLimite,
              acima: linha.acimaLimite,
              detalhe: dinheiro(linha.valor),
            }))}
          />
        </SubPainel>
      </SecaoBloco>

      <SecaoBloco
        selo="Equipe"
        titulo="Últimos 7 dias"
        descricao={`De ${formatarData(dados.operacao.periodo.inicio)} a ${formatarData(dados.operacao.periodo.fim)}.`}
        linkLabel="Mais detalhes"
        onLink={() => router.push("/relatorios?relatorio=equipe")}
      >
        <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-2">
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Phone} size="md" />}
            rotulo="Contatos feitos"
            valor={dados.operacao.contatos}
            detalhe="Ligações, WhatsApp e outros na semana."
          />
          <CardMetric
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={MessageCircle} size="md" className="text-brass" />}
            rotulo="Morador respondeu"
            valor={percentual(dados.operacao.taxaResposta)}
            detalhe={
              dados.operacao.contatos > 0
                ? `${dados.operacao.responderam} de ${dados.operacao.contatos} contatos.`
                : "Nenhum contato no período."
            }
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Users} size="md" />}
            rotulo="Unidades ligadas"
            valor={dados.operacao.unidadesContatadas}
            detalhe="Cada unidade conta uma vez."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Lembretes em aberto"
            valor={dados.operacao.retornosPendentes}
            detalhe="Atrasados, de hoje ou desta semana."
          />
        </div>

        <Grade>
          <SubPainel titulo="Atendimentos por dia">
            <GraficoColunas
              chave={`${chaveGrafico}-serie`}
              vazio={vazioGrafico}
              itens={dados.operacao.serie.map((linha) => ({
                nome: diaCurto(linha.dia),
                valor: linha.quantidade,
                rotulo: String(linha.quantidade),
                tom: "settled" as const,
              }))}
            />
          </SubPainel>
          <SubPainel titulo="Respondeu ou não">
            <GraficoRosca
              chave={`${chaveGrafico}-resposta`}
              vazio={vazioGrafico}
              centro={percentual(dados.operacao.taxaResposta)}
              legenda="responderam"
              fatias={[
                {
                  nome: "Sim",
                  valor: dados.operacao.responderam,
                  detalhe: String(dados.operacao.responderam),
                  tom: "settled",
                },
                {
                  nome: "Não",
                  valor: dados.operacao.contatos - dados.operacao.responderam,
                  detalhe: String(dados.operacao.contatos - dados.operacao.responderam),
                  tom: "mist",
                },
              ]}
            />
          </SubPainel>
        </Grade>
      </SecaoBloco>

      <SecaoBloco
        selo="Agenda"
        titulo="Retornos da equipe"
        descricao="O que precisa fazer ligação de novo."
        linkLabel="Abrir fila"
        onLink={() => router.push("/atendimentos?retorno=hoje")}
      >
        <div className="mb-md grid grid-cols-2 gap-md min-[640px]:grid-cols-4">
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Atrasados"
            valor={dados.retornos.resumo.atrasados}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Hoje"
            valor={dados.retornos.resumo.hoje}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Próximos"
            valor={dados.retornos.resumo.proximos}
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Concluídos"
            valor={dados.retornos.resumo.concluidos}
          />
        </div>
        <DashboardRetornosTable itens={dados.retornos.itens} />
      </SecaoBloco>
    </>
  );
}
