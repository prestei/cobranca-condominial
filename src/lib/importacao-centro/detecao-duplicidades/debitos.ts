import type { Debito } from "@/data/catalogo";
import type { DebitoImportRow } from "@/lib/importacoes/importar-debitos-planilha";
import { chaveIdentificadorExterno } from "@/lib/importacao-centro/detecao-duplicidades/chaves";
import type { ResultadoDetecaoDuplicidade } from "@/lib/importacao-centro/detecao-duplicidades/types";
import { normalizarCategoriaImportacao } from "@/lib/importacao-centro/normalizacao-campos";

/** Chave natural: condomínio, unidade, categoria (descrição), referência, vencimento e valor principal. */
export function chaveNaturalDebito(row: Pick<DebitoImportRow, "condominioId" | "unidadeId" | "referencia" | "dataVencimento" | "valor" | "descricao">): string {
  const cat = normalizarCategoriaImportacao(row.descricao).normalizado ?? "";
  const ref = row.referencia.trim().toLocaleLowerCase("pt-BR");
  const valorPrincipal = row.valor.trim();
  return `${row.condominioId}:${row.unidadeId}:${cat}:${ref}:${row.dataVencimento}:${valorPrincipal}`;
}

function camposEquivalentes(a: Debito, row: DebitoImportRow): { iguais: boolean; coincidentes: string[]; divergentes: string[] } {
  const coincidentes: string[] = [];
  const divergentes: string[] = [];

  const comparar = (campo: string, va: string, vb: string) => {
    if (va.trim() === vb.trim()) coincidentes.push(campo);
    else divergentes.push(campo);
  };

  comparar("unidade", String(a.unidadeId), String(row.unidadeId));
  comparar("referencia", a.referencia, row.referencia);
  comparar("vencimento", a.dataVencimento, row.dataVencimento);
  comparar("valorPrincipal", a.valor, row.valor);
  comparar("valorAtualizado", a.valorAtualizado, row.valorAtualizado);
  comparar("status", a.status, row.status);

  const catA = normalizarCategoriaImportacao(a.descricao).normalizado ?? "";
  const catB = normalizarCategoriaImportacao(row.descricao).normalizado ?? "";
  if (catA === catB) coincidentes.push("categoria");
  else divergentes.push("categoria");

  return { iguais: divergentes.length === 0, coincidentes, divergentes };
}

function semCorrespondencia(): ResultadoDetecaoDuplicidade {
  return {
    correspondencia: "nenhuma",
    acoesPermitidas: ["importar_novo"],
    acaoPadrao: "importar_novo",
  };
}

export function encontrarDebitoCorrespondente(
  debitos: Debito[],
  row: DebitoImportRow,
): { debito?: Debito; via: "externo" | "natural" | null } {
  const ext = chaveIdentificadorExterno(row.identificadorExterno);
  if (ext) {
    const porExt = debitos.find((item) => chaveIdentificadorExterno(item.identificadorExterno) === ext);
    if (porExt) return { debito: porExt, via: "externo" };
  }
  const natural = chaveNaturalDebito(row);
  const porNatural = debitos.find(
    (item) => !chaveIdentificadorExterno(item.identificadorExterno) && chaveNaturalDebito(item) === natural,
  );
  if (porNatural) return { debito: porNatural, via: "natural" };
  return { via: null };
}

export function detectarDuplicidadeDebito(
  row: DebitoImportRow,
  debitos: Debito[],
): ResultadoDetecaoDuplicidade & { manualProtegido?: boolean } {
  const { debito: existente, via } = encontrarDebitoCorrespondente(debitos, row);
  if (!existente || !via) return semCorrespondencia();

  if (!existente.identificadorExterno.trim() && !row.identificadorExterno.trim()) {
    const eq = camposEquivalentes(existente, row);
    if (eq.iguais) {
      return {
        correspondencia: "exata",
        registroExistenteId: existente.id,
        chaveComparacao: chaveNaturalDebito(row),
        criteriosCoincidentes: eq.coincidentes,
        acoesPermitidas: ["ignorar_existente"],
        acaoPadrao: "ignorar_existente",
        mensagem: "Débito já registrado (cadastro manual ou anterior).",
      };
    }
    return {
      correspondencia: "possivel",
      registroExistenteId: existente.id,
      manualProtegido: true,
      criteriosCoincidentes: eq.coincidentes,
      criteriosDivergentes: eq.divergentes,
      acoesPermitidas: ["ignorar_existente", "revisao_manual", "solicitar_correcao"],
      acaoPadrao: "ignorar_existente",
      mensagem: "Registro manual existente sem ID externo; não será alterado automaticamente.",
    };
  }

  const eq = camposEquivalentes(existente, row);
  if (eq.iguais) {
    return {
      correspondencia: "exata",
      registroExistenteId: existente.id,
      chaveComparacao: via === "externo" ? `externo:${chaveIdentificadorExterno(row.identificadorExterno)}` : chaveNaturalDebito(row),
      criteriosCoincidentes: eq.coincidentes,
      acoesPermitidas: ["ignorar_existente"],
      acaoPadrao: "ignorar_existente",
      mensagem: "Sem alterações em relação ao cadastro.",
    };
  }

  return {
    correspondencia: "possivel",
    registroExistenteId: existente.id,
    chaveComparacao: via === "externo" ? `externo:${chaveIdentificadorExterno(row.identificadorExterno)}` : chaveNaturalDebito(row),
    criteriosCoincidentes: eq.coincidentes,
    criteriosDivergentes: eq.divergentes,
    acoesPermitidas: ["ignorar_existente", "atualizar_existente", "revisao_manual", "solicitar_correcao"],
    acaoPadrao: "revisao_manual",
    mensagem: "Registro existente com diferenças; atualização exige decisão explícita.",
  };
}

export function chaveDuplicidadeDebitoNoArquivo(row: DebitoImportRow): string {
  const ext = chaveIdentificadorExterno(row.identificadorExterno);
  if (ext) return `ext:${ext}`;
  return `nat:${chaveNaturalDebito(row)}`;
}

/** @deprecated use chaveNaturalDebito — mantido para testes legados */
export function chaveNaturalDebitoLegado(row: DebitoImportRow): string {
  return `${row.unidadeId}:${row.referencia.trim().toLocaleLowerCase("pt-BR")}:${row.dataVencimento}:${row.valorAtualizado}`;
}
