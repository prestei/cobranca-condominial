import { Responsavel } from "@/data/catalogo";
import { prisma } from "@/lib/db/prisma";
import { mapResponsibleToResponsavel } from "@/lib/db/mappers";

function texto(value: string | null | undefined): string | null {
  const t = value?.trim();
  return t ? t : null;
}

function responsavelToData(item: Responsavel) {
  return {
    id: item.id,
    name: item.nome,
    taxId: item.cpfCnpj,
    personType: item.tipoPessoa,
    phone: texto(item.telefone),
    whatsapp: texto(item.whatsapp),
    email: texto(item.email),
    address: texto(item.endereco),
    notes: texto(item.observacoes),
  };
}

export async function listResponsibleParties(): Promise<Responsavel[]> {
  const rows = await prisma.responsibleParty.findMany({ orderBy: { id: "asc" } });
  return rows.map(mapResponsibleToResponsavel);
}

export async function findResponsiblePartyById(id: number): Promise<Responsavel | null> {
  const row = await prisma.responsibleParty.findUnique({ where: { id } });
  return row ? mapResponsibleToResponsavel(row) : null;
}

export async function findResponsiblePartyByTaxId(taxId: string): Promise<Responsavel | null> {
  const row = await prisma.responsibleParty.findFirst({
    where: { taxId: taxId.trim() },
  });
  return row ? mapResponsibleToResponsavel(row) : null;
}

export async function nextResponsiblePartyId(): Promise<number> {
  const agg = await prisma.responsibleParty.aggregate({ _max: { id: true } });
  return (agg._max.id ?? 0) + 1;
}

export async function createResponsibleParty(item: Responsavel): Promise<Responsavel> {
  const row = await prisma.responsibleParty.create({ data: responsavelToData(item) });
  return mapResponsibleToResponsavel(row);
}

export async function updateResponsibleParty(item: Responsavel): Promise<Responsavel> {
  const row = await prisma.responsibleParty.update({
    where: { id: item.id },
    data: {
      name: item.nome,
      taxId: item.cpfCnpj,
      personType: item.tipoPessoa,
      phone: texto(item.telefone),
      whatsapp: texto(item.whatsapp),
      email: texto(item.email),
      address: texto(item.endereco),
      notes: texto(item.observacoes),
    },
  });
  return mapResponsibleToResponsavel(row);
}

export async function deleteResponsibleParty(id: number): Promise<void> {
  await prisma.responsibleParty.delete({ where: { id } });
}
