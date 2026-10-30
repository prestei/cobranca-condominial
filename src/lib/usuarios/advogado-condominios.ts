import { getCadastros, registrarAuditoria, setCondominios, type Condominio } from "@/data/catalogo";

function cargoAdvogadoId() {
  return getCadastros().cargos.find((item) => item.nome === "Advogado")?.id ?? null;
}

export function condominiosDoAdvogado(nomeAdvogado: string): Condominio[] {
  const alvo = nomeAdvogado.trim();
  if (!alvo) return [];
  return getCadastros().condominios.filter((item) => item.advogados.includes(alvo));
}

export function idsCondominiosDoAdvogado(nomeAdvogado: string): number[] {
  return condominiosDoAdvogado(nomeAdvogado).map((item) => item.id);
}

/** Atualiza vínculos advogado ↔ condomínio pelo nome do colaborador (cadastro do condomínio). */
export function sincronizarCondominiosAdvogado(
  actorUserId: number,
  usuarioId: number,
  cargoId: number,
  nomeAdvogado: string,
  condominioIds: number[],
  meta?: { ip?: string; userAgent?: string },
) {
  const advogadoId = cargoAdvogadoId();
  if (advogadoId === null || cargoId !== advogadoId) return;

  const nome = nomeAdvogado.trim();
  if (!nome) return;

  const alvo = new Set(condominioIds.filter((id) => Number.isFinite(id) && id > 0));
  const cadastros = getCadastros();

  setCondominios((current) =>
    current.map((item) => {
      const deveIncluir = alvo.has(item.id);
      const inclui = item.advogados.includes(nome);
      if (deveIncluir && !inclui) {
        return { ...item, advogados: [...item.advogados, nome] };
      }
      if (!deveIncluir && inclui) {
        return { ...item, advogados: item.advogados.filter((adv) => adv !== nome) };
      }
      return item;
    }),
  );

  registrarAuditoria(
    {
      entidade: "user",
      registroId: String(usuarioId),
      acao: "UPDATE",
      dadosAnteriores: cadastros.condominios
        .filter((item) => item.advogados.includes(nome))
        .map((item) => item.id)
        .join(","),
      dadosNovos: [...alvo].join(","),
      camposAlterados: "condominios_advogado",
    },
    actorUserId,
    meta,
  );
}
