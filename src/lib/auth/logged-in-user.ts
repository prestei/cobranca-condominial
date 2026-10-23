/** ID do colaborador logado no cliente (sincronizado pelo AuthProvider). */
let usuarioLogadoId: number | null = null;

export function setUsuarioLogadoId(id: number | null) {
  usuarioLogadoId = id;
}

export function getUsuarioLogadoId(): number {
  if (usuarioLogadoId === null) {
    throw new Error("Sessão não carregada. Use dentro da área autenticada.");
  }
  return usuarioLogadoId;
}

export function getUsuarioLogadoIdOrNull() {
  return usuarioLogadoId;
}
