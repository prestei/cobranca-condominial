import type { Condominio } from "@/data/catalogo";
import { mapCondominiumToCondominio } from "@/lib/db/mappers";
import { prisma } from "@/lib/db/prisma";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import { listRoles } from "@/lib/db/repositories/identity-repository";

export async function condominiosDoAdvogado(nomeAdvogado: string): Promise<Condominio[]> {
  const alvo = nomeAdvogado.trim();
  if (!alvo) return [];
  const rows = await prisma.condominium.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapCondominiumToCondominio).filter((item) => item.advogados.includes(alvo));
}

export async function idsCondominiosDoAdvogado(nomeAdvogado: string): Promise<number[]> {
  const lista = await condominiosDoAdvogado(nomeAdvogado);
  return lista.map((item) => item.id);
}

/** Atualiza vínculos advogado ↔ condomínio pelo nome do colaborador (`condominium.lawyers_json`). */
export async function sincronizarCondominiosAdvogado(
  actorUserId: number,
  usuarioId: number,
  cargoId: number,
  nomeAdvogado: string,
  condominioIds: number[],
  meta?: { ip?: string; userAgent?: string },
): Promise<void> {
  const cargos = await listRoles();
  const advogadoId = cargos.find((item) => item.nome === "Advogado")?.id ?? null;
  if (advogadoId === null || cargoId !== advogadoId) return;

  const nome = nomeAdvogado.trim();
  if (!nome) return;

  const alvo = new Set(condominioIds.filter((id) => Number.isFinite(id) && id > 0));
  const rows = await prisma.condominium.findMany({ orderBy: { id: "asc" } });
  const condominios = rows.map(mapCondominiumToCondominio);
  const anteriores = condominios.filter((item) => item.advogados.includes(nome)).map((item) => item.id);

  for (const row of rows) {
    const condo = mapCondominiumToCondominio(row);
    const deveIncluir = alvo.has(condo.id);
    const inclui = condo.advogados.includes(nome);
    let advogados = condo.advogados;
    if (deveIncluir && !inclui) {
      advogados = [...advogados, nome];
    } else if (!deveIncluir && inclui) {
      advogados = advogados.filter((adv) => adv !== nome);
    } else {
      continue;
    }
    await prisma.condominium.update({
      where: { id: row.id },
      data: { lawyersJson: JSON.stringify(advogados) },
    });
  }

  await writeAuditLog({
    entity: "user",
    recordId: String(usuarioId),
    action: "UPDATE",
    previousData: anteriores.join(","),
    newData: [...alvo].join(","),
    changedFields: "condominios_advogado",
    userId: actorUserId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
}
