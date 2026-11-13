"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock } from "lucide-react";
import { AgendaHistoricoVisual } from "@/components/atendimentos/agenda-historico-visual";
import { Alert } from "@/components/alert";
import { Button } from "@/components/button";
import { PageContent, PageHeader } from "@/components/page-header";
import { WorkspaceShell } from "@/components/workspace-shell";
import { type Atendimento, hojeIso } from "@/data/catalogo";
import { useAgendarAtendimento } from "@/context/agendar-atendimento-context";
import { useCadastros } from "@/hooks/use-cadastros";
import { usePermissao } from "@/hooks/use-permissao";
import {
  inicioFimDoMes,
  montarAgendaDoPeriodo,
} from "@/lib/atendimentos/agrupar-historico-por-dia";
import { resolverPerfilOperacional } from "@/lib/perfil-operacional";

function mesAtualRef(hoje = hojeIso()) {
  const [y, m] = hoje.split("-").map(Number);
  return { ano: y, mes: m };
}

function deslocarMes(ano: number, mes: number, delta: number) {
  const date = new Date(ano, mes - 1 + delta, 1);
  return { ano: date.getFullYear(), mes: date.getMonth() + 1 };
}

export default function MinhaAgendaPage() {
  const router = useRouter();
  const cadastros = useCadastros();
  const { permissoes, pode } = usePermissao();
  const { abrir: abrirAgendar } = useAgendarAtendimento();
  const perfil = resolverPerfilOperacional(permissoes);
  const [refMes, setRefMes] = useState(mesAtualRef);
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    if (perfil !== "atendente") {
      router.replace("/");
    }
  }, [perfil, router]);

  const periodo = useMemo(
    () => inicioFimDoMes(refMes.ano, refMes.mes),
    [refMes.ano, refMes.mes],
  );

  const carregar = useCallback(async () => {
    if (!pode("atendimentos", "ler")) {
      setErro("Sem permissão para ver atendimentos.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro("");
    try {
      const response = await fetch("/api/atendimentos", { credentials: "same-origin" });
      const body = (await response.json()) as { atendimentos?: Atendimento[]; error?: string };
      if (!response.ok) {
        setAtendimentos([]);
        setErro(body.error ?? "Não foi possível carregar o histórico.");
        return;
      }
      setAtendimentos(body.atendimentos ?? []);
    } catch {
      setAtendimentos([]);
      setErro("Falha de comunicação ao carregar a agenda.");
    } finally {
      setCarregando(false);
    }
  }, [pode]);

  useEffect(() => {
    if (perfil !== "atendente") return;
    void carregar();
  }, [carregar, perfil, cadastros.atendimentos.length]);

  useEffect(() => {
    if (carregando) return;
    const hoje = document.getElementById("agenda-hoje");
    hoje?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [carregando, refMes.ano, refMes.mes]);

  const dias = useMemo(
    () =>
      montarAgendaDoPeriodo(
        atendimentos,
        cadastros,
        periodo.inicio,
        periodo.fim,
        hojeIso(),
      ),
    [atendimentos, cadastros, periodo.fim, periodo.inicio],
  );

  if (perfil !== "atendente") {
    return null;
  }

  return (
    <WorkspaceShell>
      <PageHeader
        icon={CalendarClock}
        title="Minha agenda"
        description="Seus atendimentos e retornos no calendário do mês."
      />
      <PageContent className="flex flex-col gap-md">
        {erro ? (
          <Alert variant="error" title="Erro ao carregar">
            {erro}
            <div className="mt-md">
              <Button size="sm" variant="secondary" onClick={() => void carregar()}>
                Tentar novamente
              </Button>
            </div>
          </Alert>
        ) : null}

        <AgendaHistoricoVisual
          dias={dias}
          carregando={carregando}
          rotuloPeriodo={periodo.rotulo}
          onAnterior={() => setRefMes((atual) => deslocarMes(atual.ano, atual.mes, -1))}
          onProximo={() => setRefMes((atual) => deslocarMes(atual.ano, atual.mes, 1))}
          onHoje={() => setRefMes(mesAtualRef())}
          onAbrirAtendimento={(unidadeId) =>
            router.push(`/atendimentos?novo=1&unidade=${unidadeId}`)
          }
          onAgendarDia={
            pode("atendimentos", "criar")
              ? (diaIso) => abrirAgendar({ dataPreferida: diaIso })
              : undefined
          }
        />

      </PageContent>
    </WorkspaceShell>
  );
}
