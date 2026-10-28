"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardList, MessageCircle, Phone, Users, Wallet } from "lucide-react";
import { CardMetric } from "@/components/card-metric";
import {
  GraficoColunas,
  GraficoRosca,
  tomPorIndice,
} from "@/components/charts";
import { EmptyState } from "@/components/empty-state";
import { Icon } from "@/components/icon";
import type { DashboardAtendente } from "@/lib/dashboard/service";
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
import { BarChart3 } from "lucide-react";
import { formatarData } from "@/data/catalogo";

type Props = {
  dados: DashboardAtendente;
  chaveGrafico: string;
};

export function DashboardAtendenteView({ dados, chaveGrafico }: Props) {
  const router = useRouter();
  const vazioGrafico = (
    <EmptyState icon={<Icon icon={BarChart3} size="lg" />} title="Sem dados" description="Não há valores para exibir no momento." />
  );
  const ind = dados.indicadores;

  return (
    <>
      {ind && ind.totalAtualizado > 0 ? (
        <Leitura>
          Sua carteira: {dinheiro(ind.totalAtualizado)} em aberto (base {formatarData(dados.dataBase)}). Hoje você registrou{" "}
          {dados.atendimentosHoje} atendimento{dados.atendimentosHoje === 1 ? "" : "s"}.
          {dados.retornos.resumo.atrasados > 0
            ? ` ${dados.retornos.resumo.atrasados} retorno${dados.retornos.resumo.atrasados === 1 ? "" : "s"} atrasado${dados.retornos.resumo.atrasados === 1 ? "" : "s"}.`
            : ""}
        </Leitura>
      ) : null}

      <SecaoBloco selo="Carteira" titulo="Minha fila" descricao="Cobranças atribuídas ao seu RE.">
        <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-3">
          <CardMetric
            iconClassName="bg-gold-subtle text-brass"
            icon={<Icon icon={ClipboardList} size="md" className="text-brass" />}
            rotulo="Em cobrança"
            valor={dados.fila.emCobranca}
            detalhe="Unidades na sua carteira."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Retornos hoje"
            valor={dados.fila.retornosHoje}
            detalhe="Na fila com retorno previsto para hoje."
          />
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Phone} size="md" />}
            rotulo="Atendimentos hoje"
            valor={dados.atendimentosHoje}
            detalhe="Registros feitos por você hoje."
          />
        </div>
      </SecaoBloco>

      {ind ? (
        <SecaoBloco
          selo="Valores"
          titulo="Inadimplência na carteira"
          descricao={`Totais na data-base ${formatarData(dados.dataBase)}.`}
          linkLabel="Ver débitos"
          onLink={() => router.push("/debitos")}
        >
          <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2 min-[1024px]:grid-cols-3">
            <CardMetric
              iconClassName="bg-gold-subtle text-brass"
              icon={<Icon icon={Wallet} size="md" className="text-brass" />}
              rotulo="Total em aberto"
              valor={dinheiro(ind.totalAtualizado)}
              detalhe="Valores persistidos no sistema."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Wallet} size="md" />}
              rotulo={`Até ${dados.limiteDias} dias`}
              valor={dinheiro(ind.ateLimite)}
              detalhe="Contas mais recentes."
            />
            <CardMetric
              iconClassName="bg-surface-subtle text-on-surface-variant"
              icon={<Icon icon={Wallet} size="md" />}
              rotulo={`Acima de ${dados.limiteDias} dias`}
              valor={dinheiro(ind.acimaLimite)}
              detalhe="Contas mais antigas."
            />
          </div>
        </SecaoBloco>
      ) : null}

      <SecaoBloco
        selo="Semana"
        titulo="Seus contatos"
        descricao={`De ${formatarData(dados.operacao.periodo.inicio)} a ${formatarData(dados.operacao.periodo.fim)}.`}
        linkLabel="Abrir atendimentos"
        onLink={() => router.push("/atendimentos")}
      >
        <div className="grid grid-cols-1 gap-md min-[640px]:grid-cols-2">
          <CardMetric
            iconClassName="bg-surface-subtle text-on-surface-variant"
            icon={<Icon icon={Phone} size="md" />}
            rotulo="Contatos feitos"
            valor={dados.operacao.contatos}
            detalhe="Registrados por você no período."
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
            rotulo="Unidades contatadas"
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
        titulo="Seus retornos"
        descricao="Próximos passos na sua carteira."
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
        <DashboardRetornosTable itens={dados.retornos.itens} mostrarRe={false} />
      </SecaoBloco>
    </>
  );
}
