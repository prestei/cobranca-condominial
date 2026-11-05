import {
  escopoCondominios,
  escopoUnidades,
  getCadastros,
  setResponsaveis,
  setUnidades,
  setVinculos,
  situacaoCobrancaUnidade,
  type Responsavel,
  type Unidade,
  type Vinculo,
} from "@/data/catalogo";
import { temPermissao } from "@/lib/permissions/check";
import { permissoesDoUsuarioId } from "@/lib/permissions/usuario";

/** Mescla unidades retornadas pela API (escopo do usuário) no catálogo do cliente. */
function normalizarUnidadeApi(unidade: Unidade): Unidade {
  return {
    ...unidade,
    bloco: unidade.bloco ?? "",
    situacao: situacaoCobrancaUnidade(unidade),
  };
}

export function sincronizarUnidadesDoServidor(unidades: Unidade[], userId?: number) {
  const cadastros = getCadastros();
  const idsCondominio = new Set(escopoCondominios(cadastros, userId).map((item) => item.id));
  const idsUnidade = new Set(escopoUnidades(cadastros, userId).map((item) => item.id));
  const perm = permissoesDoUsuarioId(userId ?? -1, cadastros);
  const escopoAdministrativo =
    temPermissao(perm, "condominios", "criar") || temPermissao(perm, "condominios", "editar");
  const doServidor = unidades.map(normalizarUnidadeApi);
  setUnidades((current) => {
    if (escopoAdministrativo) {
      const filtradas = doServidor.filter(
        (item) => idsCondominio.has(item.condominioId) && idsUnidade.has(item.id),
      );
      const foraDoEscopoVisivel = current.filter(
        (item) => !idsCondominio.has(item.condominioId) || !idsUnidade.has(item.id),
      );
      return [...foraDoEscopoVisivel, ...filtradas];
    }
    return [...doServidor];
  });
}

/** Aplica no catálogo do cliente a unidade retornada pela API (fonte após validação no servidor). */
export function aplicarUnidadeSalva(unidade: Unidade, acao: "INSERT" | "UPDATE") {
  const normalizada = normalizarUnidadeApi(unidade);
  if (acao === "INSERT") {
    setUnidades((current) => {
      if (current.some((item) => item.id === normalizada.id)) {
        return current.map((item) => (item.id === normalizada.id ? normalizada : item));
      }
      return [...current, normalizada];
    });
  } else {
    setUnidades((current) => current.map((item) => (item.id === normalizada.id ? normalizada : item)));
  }
}

export function aplicarVinculoSalvo(unidadeId: number, vinculo: Vinculo, responsavel?: Responsavel) {
  if (responsavel) {
    setResponsaveis((current) => {
      if (current.some((item) => item.id === responsavel.id)) {
        return current.map((item) => (item.id === responsavel.id ? responsavel : item));
      }
      return [...current, responsavel];
    });
  }
  setVinculos((current) => {
    const semPrincipal =
      vinculo.principal === true
        ? current.map((item) => (item.unidadeId === unidadeId ? { ...item, principal: false } : item))
        : current;
    if (semPrincipal.some((item) => item.id === vinculo.id)) {
      return semPrincipal.map((item) => (item.id === vinculo.id ? vinculo : item));
    }
    return [...semPrincipal, vinculo];
  });
}

/** Remove unidade do catálogo local após DELETE bem-sucedido na API. */
export function aplicarUnidadeExcluida(unidadeId: number) {
  setUnidades((current) => current.filter((item) => item.id !== unidadeId));
}

/** Remove vínculo do catálogo local após DELETE bem-sucedido na API. */
export function aplicarVinculoRemovido(vinculoId: number) {
  setVinculos((current) => current.filter((item) => item.id !== vinculoId));
}
