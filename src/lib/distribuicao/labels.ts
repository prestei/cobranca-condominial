/** Rótulos e tipos de distribuição automática — seguros no cliente. */

export type DistribuicaoAutomaticaEstrategia = "carga" | "rodizio" | "condominio" | "volume";

export const descricaoEstrategiaDistribuicaoAutomatica: Record<DistribuicaoAutomaticaEstrategia, string> = {
  carga:
    "Cada cobrança vai para o RE com menos unidades na carteira vigente. Empates: menor código RE.",
  rodizio:
    "Distribui em sequência fixa entre os REs ativos (ordem alfabética do código RE), uma unidade por vez.",
  condominio:
    "Mantém o mesmo RE que já cuida da maior parte das unidades daquele condomínio. Se ninguém atende o condomínio ainda, usa carga equilibrada.",
  volume:
    "Equilibra o valor total em aberto (débitos pendentes/vencidos) entre as carteiras, não só a quantidade de unidades.",
};
