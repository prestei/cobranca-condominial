/**
 * Cadastro de homologação do relatório PDF Gestão Condominial — Residencial do Mar.
 * Unidades alinhadas às 28 identificações presentes na fixture de inadimplência.
 */
import type { Condominio, Unidade } from "@/data/catalogo";

export const CONDOMINIO_RESIDENCIAL_DO_MAR: Condominio = {
  id: 3,
  nome: "Residencial do Mar",
  identificadorExterno: "GESTAO-RDM",
  status: "Ativo",
  advogados: ["Dra. Thamires"],
  administradora: "Gestão Condominial",
  cep: "41600-000",
  logradouro: "Av. Oceânica",
  numero: "1000",
  complemento: "",
  cidade: "Salvador",
  estado: "BA",
  observacao: "Base homologação — importação PDF inadimplência (Residencial do Mar).",
};

const IDENTIFICACOES_UNIDADES_RESIDENCIAL_DO_MAR = [
  "MB-0102",
  "MB-0201",
  "MB-0203",
  "MB-0301",
  "MB-0302",
  "MB-0402",
  "MB-0403",
  "MB-0601",
  "MB-0603",
  "MB-0604",
  "MB-0801",
  "MB-0802",
  "MB-0804",
  "MB-1001",
  "MB-1002",
  "MB-1003",
  "MB-1201",
  "MB-1203",
  "ME-0103",
  "ME-0403",
  "ME-0501",
  "ME-0601",
  "ME-0703",
  "ME-0803",
  "ME-1002",
  "ME-1103",
  "ME-1104",
  "ME-1303",
] as const;

function blocoDeIdentificacao(identificacao: string): string {
  const prefixo = identificacao.split("-")[0]?.trim();
  return prefixo || "—";
}

export const unidadesResidencialDoMar: Unidade[] = IDENTIFICACOES_UNIDADES_RESIDENCIAL_DO_MAR.map(
  (identificacao, indice) => ({
    id: 5 + indice,
    condominioId: CONDOMINIO_RESIDENCIAL_DO_MAR.id,
    identificacao,
    bloco: blocoDeIdentificacao(identificacao),
    tipo: "Apartamento",
    status: "Ativa",
    situacao: "Sem cobrança",
  }),
);

export const condominioResidencialDoMarSeed = CONDOMINIO_RESIDENCIAL_DO_MAR;
