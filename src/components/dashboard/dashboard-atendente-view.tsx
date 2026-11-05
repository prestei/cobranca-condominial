"use client";

import { useRouter } from "next/navigation";
import { CalendarClock, ClipboardList, Phone, Wallet } from "lucide-react";
import { Icon } from "@/components/icon";
import type { DashboardAtendente } from "@/lib/dashboard/service";
import {
  SecaoBloco,
  DashboardMetric,
  GradeMetricas,
  GradeMetricasTres,
  dinheiro,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAtendente;
  chaveGrafico: string;
};

export function DashboardAtendenteView({ dados }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;

  return (
    <>
      <SecaoBloco titulo="Minha carteira" linkLabel="Fila" onLink={() => router.push("/atendimentos")}>
        {ind ? (
          <GradeMetricas>
            <DashboardMetric
              tom="violet"
              icon={<Icon icon={ClipboardList} size="md" />}
              rotulo="Em cobrança"
              valor={dados.fila.emCobranca}
            />
            <DashboardMetric
              tom="brass"
              icon={<Icon icon={Phone} size="md" className="text-brass" />}
              rotulo="Atendimentos hoje"
              valor={dados.atendimentosHoje}
            />
            <DashboardMetric
              tom="primary"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Retornos hoje"
              valor={dados.fila.retornosHoje}
            />
            <DashboardMetric
              tom="settled"
              icon={<Icon icon={Wallet} size="md" />}
              rotulo="Em aberto"
              valor={dinheiro(ind.totalAtualizado)}
              detalhe={`Acima ${dados.limiteDias}d: ${dinheiro(ind.acimaLimite)}`}
            />
          </GradeMetricas>
        ) : (
          <GradeMetricasTres>
            <DashboardMetric
              tom="violet"
              icon={<Icon icon={ClipboardList} size="md" />}
              rotulo="Em cobrança"
              valor={dados.fila.emCobranca}
            />
            <DashboardMetric
              tom="brass"
              icon={<Icon icon={Phone} size="md" className="text-brass" />}
              rotulo="Atendimentos hoje"
              valor={dados.atendimentosHoje}
            />
            <DashboardMetric
              tom="primary"
              icon={<Icon icon={CalendarClock} size="md" />}
              rotulo="Retornos hoje"
              valor={dados.fila.retornosHoje}
            />
          </GradeMetricasTres>
        )}
      </SecaoBloco>

      <SecaoBloco titulo="Semana" linkLabel="Atendimentos" onLink={() => router.push("/atendimentos")}>
        <GradeMetricasTres>
          <DashboardMetric
            tom="brass"
            icon={<Icon icon={Phone} size="md" className="text-brass" />}
            rotulo="Contatos"
            valor={dados.operacao.contatos}
          />
          <DashboardMetric
            tom="violet"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Retornos pendentes"
            valor={dados.operacao.retornosPendentes}
          />
          <DashboardMetric
            tom="primary"
            icon={<Icon icon={ClipboardList} size="md" />}
            rotulo="Unidades contatadas"
            valor={dados.operacao.unidadesContatadas}
          />
        </GradeMetricasTres>
      </SecaoBloco>

      <SecaoBloco
        titulo="Retornos"
        linkLabel="Agenda"
        onLink={() => router.push("/atendimentos?retorno=hoje")}
      >
        <GradeMetricas>
          <DashboardMetric
            tom="brass"
            icon={<Icon icon={CalendarClock} size="md" className="text-brass" />}
            rotulo="Atrasados"
            valor={dados.retornos.resumo.atrasados}
          />
          <DashboardMetric
            tom="primary"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Hoje"
            valor={dados.retornos.resumo.hoje}
          />
          <DashboardMetric
            tom="settled"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Próximos"
            valor={dados.retornos.resumo.proximos}
          />
          <DashboardMetric
            tom="violet"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Concluídos"
            valor={dados.retornos.resumo.concluidos}
          />
        </GradeMetricas>
        <DashboardRetornosTable integrada itens={dados.retornos.itens.slice(0, 6)} mostrarRe={false} />
      </SecaoBloco>
    </>
  );
}
