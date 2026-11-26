import { agoraIso, type AtribuicaoCobranca } from "@/data/catalogo";
import { loadCadastrosForScope } from "@/lib/db/cadastros-scope";
import { writeAuditLog } from "@/lib/db/repositories/audit-repository";
import {
  findOpenAssignmentByUnit,
  updateCollectionAssignment,
} from "@/lib/db/repositories/collection-repository";
import { invalidateServiceContextCache } from "@/lib/db/service-context";
import { codigoReDoUsuario } from "@/lib/colaboradores/re-server";

/** Encerra `collection_assignment` vigente da unidade (auditoria + invalidação de cache). */
export async function encerrarCarteiraVigente(
  userId: number,
  unidadeId: number,
  motivo: string,
  meta?: { ip?: string; userAgent?: string },
): Promise<AtribuicaoCobranca | null> {
  const vigente = await findOpenAssignmentByUnit(unidadeId);
  if (!vigente) return null;
  const agora = agoraIso();
  const fechado = { ...vigente, encerradoEm: agora, motivo: motivo.trim() || vigente.motivo };
  await updateCollectionAssignment(fechado);
  const cadastros = await loadCadastrosForScope();
  const atendenteAnterior = cadastros.usuarios.find((item) => item.id === vigente.atendenteId);
  await writeAuditLog({
    entity: "collection_assignment",
    recordId: String(vigente.id),
    action: "UPDATE",
    previousData: atendenteAnterior ? codigoReDoUsuario(atendenteAnterior) ?? "" : "",
    newData: "",
    changedFields: "encerrado_em, motivo",
    userId,
    ip: meta?.ip,
    userAgent: meta?.userAgent,
  });
  invalidateServiceContextCache();
  return fechado;
}