import type { Condominio } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapCondominiumToCondominio } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function condominioToCreateData(item: Condominio) {
  return {
    id: item.id,
    name: item.nome,
    externalId: texto(item.identificadorExterno),
    status: item.status === "Inativo" ? "Inativo" : "Ativo",
    lawyersJson: JSON.stringify(item.advogados ?? []),
    administrator: texto(item.administradora),
    state: texto(item.estado),
    city: texto(item.cidade),
    zipCode: texto(item.cep),
    street: texto(item.logradouro),
    number: texto(item.numero),
    complement: texto(item.complemento),
    notes: texto(item.observacao),
  };
}

export async function listCondominiums(): Promise<Condominio[]> {
  const rows = await prisma.condominium.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapCondominiumToCondominio);
}

export async function findCondominiumById(id: number): Promise<Condominio | null> {
  const row = await prisma.condominium.findUnique({ where: { id } });
  return row ? mapCondominiumToCondominio(row) : null;
}

export async function condominiumExternalIdExists(
  externalId: string,
  excludeId: number | null,
): Promise<boolean> {
  const chave = externalId.trim().toLocaleLowerCase("pt-BR");
  if (!chave) return false;
  const rows = await prisma.condominium.findMany({
    where: excludeId !== null ? { NOT: { id: excludeId } } : undefined,
    select: { id: true, externalId: true },
  });
  return rows.some(
    (row) => (row.externalId ?? "").trim().toLocaleLowerCase("pt-BR") === chave,
  );
}

export async function nextCondominiumId(): Promise<number> {
  const agg = await prisma.condominium.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createCondominium(item: Condominio): Promise<Condominio> {
  const row = await prisma.condominium.create({ data: condominioToCreateData(item) });
  return mapCondominiumToCondominio(row);
}

export async function updateCondominium(item: Condominio): Promise<Condominio> {
  const row = await prisma.condominium.update({
    where: { id: item.id },
    data: {
      name: item.nome,
      externalId: texto(item.identificadorExterno),
      status: item.status === "Inativo" ? "Inativo" : "Ativo",
      lawyersJson: JSON.stringify(item.advogados ?? []),
      administrator: texto(item.administradora),
      state: texto(item.estado),
      city: texto(item.cidade),
      zipCode: texto(item.cep),
      street: texto(item.logradouro),
      number: texto(item.numero),
      complement: texto(item.complemento),
      notes: texto(item.observacao),
    },
  });
  return mapCondominiumToCondominio(row);
}

export async function deleteCondominium(id: number): Promise<void> {
  await prisma.condominium.delete({ where: { id } });
}

/** Verifica vínculos operacionais que impedem exclusão física. */
export async function condominiumHasOperationalHistory(condominiumId: number): Promise<boolean> {
  const unitIds = await prisma.unit.findMany({
    where: { condominiumId },
    select: { id: true },
  });
  if (unitIds.length === 0) {
    const debtCount = await prisma.debt.count({ where: { condominiumId } });
    return debtCount > 0;
  }
  const ids = unitIds.map((u) => u.id);
  const [debts, tickets, assignments] = await Promise.all([
    prisma.debt.count({ where: { condominiumId } }),
    prisma.serviceTicket.count({ where: { unitId: { in: ids } } }),
    prisma.collectionAssignment.count({ where: { unitId: { in: ids } } }),
  ]);
  return unitIds.length > 0 || debts > 0 || tickets > 0 || assignments > 0;
}
