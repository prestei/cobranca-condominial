import type { Cadastros } from "@/data/catalogo";
import { listRoles, listUsers } from "@/lib/db/repositories/identity-repository";
import { listCondominiums } from "@/lib/db/repositories/condominium-repository";
import { listUnits } from "@/lib/db/repositories/unit-repository";
import { listCollectionAssignments } from "@/lib/db/repositories/collection-repository";
import { listDebts } from "@/lib/db/repositories/debt-repository";
import { listServiceTickets } from "@/lib/db/repositories/service-ticket-repository";
import { listNegotiationProposals, listAgreementInstallments, listAgreementPayments } from "@/lib/db/repositories/negotiation-repository";
import { listLegalReferrals, listLegalDocuments } from "@/lib/db/repositories/legal-repository";
import { listInternalNotifications, listNotificationFailures } from "@/lib/db/repositories/notification-repository";
import { listImports } from "@/lib/db/repositories/import-repository";
import { listResponsibleParties } from "@/lib/db/repositories/responsible-party-repository";
import { listUnitLinks } from "@/lib/db/repositories/unit-repository";
import { listAuditLogs } from "@/lib/db/repositories/audit-repository";

const vazioEscopo: Omit<
  Cadastros,
  "cargos" | "usuarios" | "condominios" | "unidades" | "atribuicoesCobranca"
> = {
  responsaveis: [],
  vinculos: [],
  debitos: [],
  atendimentos: [],
  propostasNegociacao: [],
  encaminhamentosJuridicos: [],
  documentosJuridicos: [],
  parcelasAcordo: [],
  pagamentosAcordo: [],
  importacoes: [],
  auditoria: [],
  notificacoesInternas: [],
  notificacaoFalhas: [],
};

/** Carrega o mínimo necessário para `escopoCondominios` / `escopoUnidades` e validações de permissão. */
export async function loadCadastrosForScope(): Promise<Cadastros> {
  const [cargos, usuarios, condominios, unidades, atribuicoesCobranca] = await Promise.all([
    listRoles(),
    listUsers(),
    listCondominiums(),
    listUnits(),
    listCollectionAssignments(),
  ]);
  return {
    ...vazioEscopo,
    cargos,
    usuarios,
    condominios,
    unidades,
    atribuicoesCobranca,
  };
}

/** Carrega cadastros operacionais completos para relatórios, dashboard e fila. */
export async function loadFullOperationalCadastros(): Promise<Cadastros> {
  const [
    cargos,
    usuarios,
    condominios,
    unidades,
    responsaveis,
    vinculos,
    debitos,
    importacoes,
    auditoria,
    atribuicoesCobranca,
    atendimentos,
    propostasNegociacao,
    parcelasAcordo,
    pagamentosAcordo,
    encaminhamentosJuridicos,
    documentosJuridicos,
    notificacoesInternas,
    notificacaoFalhas,
  ] = await Promise.all([
    listRoles(),
    listUsers(),
    listCondominiums(),
    listUnits(),
    listResponsibleParties(),
    listUnitLinks(),
    listDebts(),
    listImports(),
    listAuditLogs(),
    listCollectionAssignments(),
    listServiceTickets(),
    listNegotiationProposals(),
    listAgreementInstallments(),
    listAgreementPayments(),
    listLegalReferrals(),
    listLegalDocuments(),
    listInternalNotifications(),
    listNotificationFailures(),
  ]);
  return {
    cargos,
    usuarios,
    condominios,
    unidades,
    responsaveis,
    vinculos,
    debitos,
    importacoes,
    auditoria,
    atribuicoesCobranca,
    atendimentos,
    propostasNegociacao,
    parcelasAcordo,
    pagamentosAcordo,
    encaminhamentosJuridicos,
    documentosJuridicos,
    notificacoesInternas,
    notificacaoFalhas,
  };
}
