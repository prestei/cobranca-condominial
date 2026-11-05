"use client";

import { useRouter } from "next/navigation";
import { Building2, CalendarClock, ClipboardList, Phone, Scale, Users, Wallet } from "lucide-react";
import { Icon } from "@/components/icon";
import type { DashboardAdministradora } from "@/lib/dashboard/service";
import {
  SecaoBloco,
  ListaValorCompacta,
  DashboardMetric,
  GradeMetricas,
  GradeMetricasTres,
  dinheiro,
  percentual,
} from "@/components/dashboard/dashboard-shared";
import { DashboardRetornosTable } from "@/components/dashboard/dashboard-retornos-table";

type Props = {
  dados: DashboardAdministradora;
  chaveGrafico: string;
};

export function DashboardAdministradoraView({ dados }: Props) {
  const router = useRouter();
  const ind = dados.indicadores;

  return (
    <>
      <SecaoBloco
        titulo="Inadimplência"
        linkLabel="Relatório"
        onLink={() => router.push("/relatorios?relatorio=carteira")}
      >
        <GradeMetricas>
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
          <DashboardMetric
            tom="violet"
            icon={<Icon icon={ClipboardList} size="md" />}
            rotulo="Na fila"
            valor={dados.fila.emCobranca}
            detalhe={
              dados.fila.semResponsavel > 0
                ? `${dados.fila.semResponsavel} sem RE`
                : dados.fila.retornosHoje > 0
                  ? `${dados.fila.retornosHoje} retorno hoje`
                  : undefined
            }
          />
        </GradeMetricas>

        <ListaValorCompacta
          integrada
          itens={dados.rankingCondominio.map((linha) => ({
            chave: String(linha.condominioId),
            nome: linha.nome,
            valor: dinheiro(linha.valor),
            secundario: `${linha.unidadesDevedoras}/${linha.unidadesTotal} unidades`,
          }))}
          vazio="Nenhum débito em aberto na carteira."
        />
      </SecaoBloco>

      <SecaoBloco
        titulo="Operação · 7 dias"
        linkLabel="Equipe"
        onLink={() => router.push("/relatorios?relatorio=equipe")}
      >
        <GradeMetricasTres>
          <DashboardMetric
            tom="brass"
            icon={<Icon icon={Phone} size="md" className="text-brass" />}
            rotulo="Contatos"
            valor={dados.operacao.contatos}
          />
          <DashboardMetric
            tom="primary"
            icon={<Icon icon={Users} size="md" />}
            rotulo="Unidades"
            valor={dados.operacao.unidadesContatadas}
          />
          <DashboardMetric
            tom="violet"
            icon={<Icon icon={CalendarClock} size="md" />}
            rotulo="Retornos pendentes"
            valor={dados.operacao.retornosPendentes}
          />
        </GradeMetricasTres>
      </SecaoBloco>

      <SecaoBloco
        titulo="Retornos"
        linkLabel="Abrir fila"
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
        <DashboardRetornosTable integrada itens={dados.retornos.itens.slice(0, 6)} />
      </SecaoBloco>
    </>
  );
}
