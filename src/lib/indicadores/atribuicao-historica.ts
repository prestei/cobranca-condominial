import { getCadastros } from "@/data/catalogo";
import { codigoReDoUsuario } from "@/lib/colaboradores/re";

/** Atendente com atribuição vigente na unidade no instante informado (ISO). */
export function atendenteIdNaDataUnidade(unidadeId: number, instanteIso: string): number | null {
  const cadastros = getCadastros();
  let vigente: { atendenteId: number; atribuidoEm: string } | null = null;

  for (const atrib of cadastros.atribuicoesCobranca) {
    if (atrib.unidadeId !== unidadeId) continue;
    if (atrib.atribuidoEm > instanteIso) continue;
    if (atrib.encerradoEm && atrib.encerradoEm <= instanteIso) continue;
    if (!vigente || atrib.atribuidoEm > vigente.atribuidoEm) {
      vigente = { atendenteId: atrib.atendenteId, atribuidoEm: atrib.atribuidoEm };
    }
  }

  return vigente?.atendenteId ?? null;
}

export function reDoUsuarioId(userId: number | null | undefined): string | null {
  if (userId == null) return null;
  const usuario = getCadastros().usuarios.find((item) => item.id === userId);
  if (!usuario) return null;
  return codigoReDoUsuario(usuario);
}
